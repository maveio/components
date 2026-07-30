import { StatusRenderer, Task } from '@lit/task';
import { ReactiveControllerHost } from 'lit';

import { Config } from '../config';
import * as API from './api';

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
  private _signedUrl: string;
  private _version: number;
  private _enabled: boolean;
  private _embedData: Partial<API.Embed>;
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
          const requestSignedUrl = this.signedUrl;
          const data = await this.fetchManifestWithRetry(() => {
            if (!this.enabled) return;
            if (
              this.embed !== requestEmbed ||
              this.token !== requestToken ||
              this.signedUrl !== requestSignedUrl
            )
              return;

            return this.manifest_url;
          });

          if (!data) return;

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
          throw new Error(`Failed to fetch "${this.embed}"`);
        }
      },
      () => [this.embed, this.token, this.signedUrl, this.enabled],
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
    } else {
      const url = new URL(`${API.baseUrl()}/collection/${this.token}`);
      if (this.embed && this.embed?.length > 1)
        url.searchParams.append('embed', this.embed);
      return url.toString();
    }
  }

  set embed(value: string) {
    if (this._embed != value) {
      this._embed = value;
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
      this.host.requestUpdate();
    }
  }

  get token() {
    return this._token;
  }

  set signedUrl(value: string) {
    if (this._signedUrl != value) {
      this._signedUrl = value;
      this.loading = true;
      this.host.requestUpdate();
    }
  }

  get signedUrl() {
    return this._signedUrl;
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

  get mediaRoot(): string {
    return this.signedUrl || `${this.cdnRoot}/${this.embedId}`;
  }

  refresh(): Promise<unknown> {
    this.enabled = true;
    this.loading = true;
    return this.task?.run();
  }

  embedFile(file: string, params = new URLSearchParams()): string {
    const parsedFile = new URL(file, 'https://media.invalid/');
    const versionPath = file.split('?')[0] == 'manifest.json' ? '' : this.version;
    const url = this.mediaUrl(`${versionPath}${parsedFile.pathname.slice(1)}`);

    parsedFile.searchParams.forEach((value, key) => params.set(key, value));
    if (this.token) params.set('token', this.token);
    if (file == 'manifest.json') {
      if (params.has('e')) params.delete('e');
      params.set('e', new Date().getTime().toString());
    }
    if (file !== 'manifest.json' && !this.caching) {
      // const e = !this.caching ? new Date() : new Date(this._embedData.created_at);
      if (!params.has('e')) {
        params.set('e', new Date().getTime().toString());
      }
    }

    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  }

  authorizeUrl(source: string | null | undefined): string | null | undefined {
    if (!source || !this.signedUrl) return source;

    try {
      const publicUrl = new URL(source);
      const embedMarker = `/${this.embedId}/`;
      const markerIndex = publicUrl.pathname.indexOf(embedMarker);
      if (markerIndex < 0) return source;

      const relativePath = publicUrl.pathname.slice(markerIndex + embedMarker.length);
      const signedUrl = this.mediaUrl(relativePath);
      publicUrl.searchParams.forEach((value, key) =>
        signedUrl.searchParams.set(key, value),
      );
      return signedUrl.toString();
    } catch {
      return source;
    }
  }

  private mediaUrl(relativePath: string): URL {
    const url = new URL(this.mediaRoot);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${relativePath.replace(
      /^\//,
      '',
    )}`;
    return url;
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
