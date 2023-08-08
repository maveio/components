import { StatusRenderer, Task } from '@lit-labs/task';
import { ReactiveControllerHost } from 'lit';

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
  private _theme: string;
  private _token: string;

  constructor(host: ReactiveControllerHost, embedType: EmbedType = EmbedType.Embed) {
    this.host = host;
    this.type = embedType;

    this.task = new Task(
      this.host,
      async () => {
        try {
          if (this.type == EmbedType.Embed && !this.embed) {
            console.warn('No embed attr provided for mave-player');
            return;
          }
          if (this.type == EmbedType.Collection && !this.token) {
            console.warn('No token attr provided for mave-list');
            return;
          }

          const url =
            this.type == EmbedType.Embed
              ? `${this.embedUrl}/manifest.json`
              : `${API.baseUrl}/collection/${this.token}`;

          const response = await fetch(url);

          if (this._theme) await import(`${this.cdnRoot}/themes/${this._theme}.js`);

          const data = await response.json();
          if (this.type == EmbedType.Embed) {
            return data as Partial<API.Embed>;
          } else {
            return data as Partial<API.Collection>;
          }
        } catch {
          throw new Error(`Failed to fetch "${this.embed}"`);
        }
      },
      () => [this.embed],
    );
  }

  set embed(value: string) {
    if (this._embed != value) {
      this._embed = value;
      this.host.requestUpdate();
    }
  }

  get embed() {
    return this._embed;
  }

  set theme(value: string) {
    if (this._theme !== value && value != 'mave-theme-main') {
      this._theme = value;
    }
  }

  get theme() {
    return this._theme;
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
    return this.embed.substring(0, 5);
  }

  get embedId(): string {
    return this.embed.substring(5, this.embed.length);
  }

  get cdnRoot(): string {
    return `https://space-${this.spaceId}.video-dns.com`;
  }

  get embedUrl(): string {
    return `${this.cdnRoot}/${this.embedId}`;
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
