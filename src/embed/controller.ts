import { StatusRenderer, Task } from '@lit/task';
import { ReactiveControllerHost } from 'lit';

import { Config } from '../config';
import * as API from './api';
import { PlaybackSource, playbackSource } from './playback';

export enum EmbedType {
  Collection,
  Embed,
}

export class EmbedController {
  private static readonly MANIFEST_RETRY_DELAYS_MS = [500, 1500, 3500];
  private static readonly MANIFEST_RETRY_STATUSES = new Set([
    408, 409, 425, 429, 500, 502, 503, 504,
  ]);

  host: ReactiveControllerHost;
  private task: Task;
  private type: EmbedType;
  private _embed: string;
  private _token: string;
  private _playbackSource?: PlaybackSource;
  private _version: number;
  private _enabled: boolean;
  private _embedData: Partial<API.Embed>;
  collectionOrder?: string;
  caching: boolean = true;
  loading: boolean = true;

  constructor(
    host: ReactiveControllerHost,
    embedType: EmbedType = EmbedType.Embed,
    enabled = true,
  ) {
    this.host = host;
    this.type = embedType;
    this._enabled = enabled;

    this.loading = true;
    this.task = new Task(
      this.host,
      async () => {
        try {
          if (!this.enabled) {
            return;
          }

          if (this.type == EmbedType.Embed && !this.embed) {
            return;
          }
          if (this.type == EmbedType.Collection && !this.token) {
            console.warn('No token attr provided for mave-list');
            return;
          }

          const requestEmbed = this.embed;
          const requestToken = this.token;
          const requestOrder = this.collectionOrder;
          const source =
            this.type == EmbedType.Embed && requestToken
              ? playbackSource(requestToken, requestEmbed)
              : undefined;

          if (this.embed !== requestEmbed || this.token !== requestToken) return;
          this._playbackSource = source;

          const data =
            this.type == EmbedType.Collection
              ? await this.fetchCollectionPage(1)
              : await this.fetchManifestWithRetry(() => {
                  if (!this.enabled) return;
                  if (this.embed !== requestEmbed || this.token !== requestToken) return;

                  return this.manifest_url;
                });

          if (!data) return;
          if (this.collectionOrder !== requestOrder) return;

          this.loading = false;

          if (this.type == EmbedType.Embed) {
            this._embedData = data as Partial<API.Embed>;
            this.version = this._embedData.video?.version || 0;
            return this._embedData;
          } else {
            return data as Partial<API.Collection>;
          }
        } catch (e) {
          console.log(e);
          throw new Error(`Failed to fetch "${this.embed}"`, { cause: e });
        }
      },
      () => [this.embed, this.token, this.enabled, this.collectionOrder],
    );
  }

  private async fetchManifestWithRetry(
    manifestUrl: () => string | undefined,
  ): Promise<unknown | undefined> {
    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= EmbedController.MANIFEST_RETRY_DELAYS_MS.length;
      attempt++
    ) {
      const url = manifestUrl();
      if (!url) return;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw EmbedController.responseError(response, url);
        }

        return await response.json();
      } catch (error) {
        lastError = error;

        const retryDelay = EmbedController.MANIFEST_RETRY_DELAYS_MS[attempt];
        if (retryDelay == null || !EmbedController.shouldRetryManifestError(error)) {
          break;
        }

        await EmbedController.delay(EmbedController.withJitter(retryDelay));
      }
    }

    throw lastError;
  }

  private static responseError(response: Response, url: string) {
    const error = new Error(
      `Manifest request failed with status ${response.status}`,
    ) as Error & {
      status?: number;
      url?: string;
    };
    error.status = response.status;
    error.url = url;
    return error;
  }

  private static shouldRetryManifestError(error: unknown) {
    const status =
      typeof error === 'object' && error
        ? (error as { status?: number }).status
        : undefined;

    if (typeof status !== 'number') return true;

    return EmbedController.MANIFEST_RETRY_STATUSES.has(status);
  }

  private static withJitter(delay: number) {
    return delay + Math.floor(Math.random() * 250);
  }

  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get manifest_url(): string {
    if (this.type == EmbedType.Embed) {
      return this.embedFile('manifest.json');
    }
    return this.collectionUrl(1);
  }

  private collectionUrl(page: number): string {
    const url = new URL(`${API.baseUrl()}/collection/${this.token}`);
    if (this.embed?.length > 1) url.searchParams.set('embed', this.embed);
    if (this.collectionOrder) {
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', '25');
      url.searchParams.set('order', this.collectionOrder);
    }
    return url.toString();
  }

  async fetchCollectionPage(page: number, signal?: AbortSignal): Promise<API.Collection> {
    const url = this.collectionUrl(page);
    const response = signal ? await fetch(url, { signal }) : await fetch(url);
    if (!response.ok)
      throw new Error(`Collection request failed with status ${response.status}`);
    return response.json();
  }

  set embed(value: string) {
    if (this._embed != value) {
      this._embed = value;
      this._playbackSource = undefined;
      this.loading = true;
      this.host.requestUpdate();
    }
  }

  get embed() {
    return this._embed;
  }

  set token(value: string) {
    if (this._token != value) {
      this._token = value;
      this._playbackSource = undefined;
      this.host.requestUpdate();
    }
  }

  get token() {
    return this._token;
  }

  set enabled(value: boolean) {
    if (this._enabled != value) {
      this._enabled = value;
      if (value) this.loading = true;
      this.host.requestUpdate();
    }
  }

  get enabled() {
    return this._enabled;
  }

  get spaceId(): string {
    return this.embed?.substring(0, 5);
  }

  get embedId(): string {
    return this.embed?.substring(5, this.embed?.length);
  }

  get version(): string {
    if (this._version) {
      return `/v${this._version}/`;
    }
    return '/';
  }

  set version(value: number) {
    if (this._version != value) {
      this._version = value;
      this.host.requestUpdate();
    }
  }

  get cdnRoot(): string {
    return Config.cdn.endpoint.replace('${this.spaceId}', this.spaceId);
  }

  refresh(): Promise<unknown> {
    this.enabled = true;
    this.loading = true;
    return this.task?.run();
  }

  embedFile(file: string, params = new URLSearchParams()): string {
    const mediaBaseUrl = this._playbackSource?.media_base_url.replace(/\/$/, '');
    const url = new URL(
      `${mediaBaseUrl || `${this.cdnRoot}/${this.embedId}`}${
        file == 'manifest.json' ? '/' : this.version
      }${file}`,
    );

    if (file.includes('?')) {
      const [, query] = file.split('?');
      const query_params = new URLSearchParams(query);
      query_params.forEach((value, key) => {
        params.append(key, value);
      });
    }

    if (this._playbackSource) params.append('token', this._playbackSource.token);
    if (file == 'manifest.json') {
      if (params.has('e')) params.delete('e');
      params.append('e', new Date().getTime().toString());
    }
    if (file !== 'manifest.json' && !this.caching) {
      // const e = !this.caching ? new Date() : new Date(this._embedData.created_at);
      if (!params.has('e')) {
        params.append('e', new Date().getTime().toString());
      }
    }
    url.search = params.toString();
    return url.toString();
  }

  dynamicImage(time: string | number, format = 'jpg'): string {
    if (!this._playbackSource) {
      return `https://image.mave.io/${this.spaceId}${this.embedId}.${format}?time=${time}`;
    }

    const url = new URL(
      `${this._playbackSource.media_base_url.replace(/\/$/, '')}/dynamic.${format}`,
    );
    url.searchParams.set('time', String(time));
    url.searchParams.set('token', this._playbackSource.token);
    return url.toString();
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
