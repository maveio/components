import { StatusRenderer, Task } from '@lit/task';
import { ReactiveControllerHost } from 'lit';

import { Config } from '../config';
import * as API from './api';

export enum EmbedType {
  Collection,
  Embed,
}

export class EmbedController {
  host: ReactiveControllerHost;
  private task: Task;
  private type: EmbedType;
  private _embed: string;
  private _token: string;
  private _version: number;
  private _embedData: Partial<API.Embed>;
  caching: boolean = true;
  loading: boolean = true;

  constructor(host: ReactiveControllerHost, embedType: EmbedType = EmbedType.Embed) {
    this.host = host;
    this.type = embedType;

    this.loading = true;
    this.task = new Task(
      this.host,
      async () => {
        try {
          if (this.type == EmbedType.Embed && !this.embed) {
            return;
          }
          if (this.type == EmbedType.Collection && !this.token) {
            console.warn('No token attr provided for mave-list');
            return;
          }

          const response = await fetch(this.manifest_url);
          const data = await response.json();
          this.loading = false;

          if (this.type == EmbedType.Embed) {
            this._embedData = data;
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
      () => [this.embed],
    );
  }

  get manifest_url(): string {
    if (this.type == EmbedType.Embed) {
      return this.embedFile('manifest.json');
    } else {
      const url = new URL(`${API.baseUrl}/collection/${this.token}`);
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
    this.loading = true;
    return this.task?.run();
  }

  embedFile(file: string, params = new URLSearchParams()): string {
    const url = new URL(
      `${this.cdnRoot}/${this.embedId}${
        file == 'manifest.json' ? '/' : this.version
      }${file}`,
    );

    if (file.includes('?')) {
      const [_file, query] = file.split('?');
      const query_params = new URLSearchParams(query);
      query_params.forEach((value, key) => {
        params.append(key, value);
      });
    }

    if (this.token) params.append('token', this.token);
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

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
