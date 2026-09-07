import { Task } from '@lit/task';
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { PlaybackSession, playbackSession } from '../embed/playback';
import { MaveElement } from '../utils/mave_element';

export class Image extends MaveElement {
  private _token: string;
  private sessionTask = new Task(this, {
    task: async ([embed, token]) => {
      if (!embed || !token) return;
      const session = await playbackSession(token, embed);
      if (this.embed !== embed || this.token !== token) return;
      return session;
    },
    args: () => [this.embed, this.token] as const,
  });

  @property({ type: String })
  get embed(): string {
    return this._embed;
  }

  set embed(value: string) {
    if (this._embed !== value) {
      this._embed = value;
      this.requestUpdate('embed');
    }
  }

  @property({ attribute: false })
  get token(): string {
    return this._token;
  }

  set token(value: string) {
    if (this._token !== value) {
      this._token = value;
      this.requestUpdate('token');
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    img {
      width: 100%;
      max-height: 100vh;
    }
  `;

  poster(session?: PlaybackSession): string {
    if (!session) return `${this.cdn_root}/${this.embedId}/poster.webp`;
    const url = new URL(`${session.media_base_url.replace(/\/$/, '')}/poster.webp`);
    url.searchParams.set('token', session.token);
    return url.toString();
  }

  render() {
    if (!this.token) return html`<img src=${this.poster()} />`;

    return html`${this.sessionTask.render({
      pending: () => html``,
      error: () => html``,
      complete: (session) => html`<img src=${this.poster(session)} />`,
    })}`;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-img')) {
    window.customElements.define('mave-img', Image);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-img': Image;
  }
}
