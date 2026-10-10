import { css, html } from 'lit';
import { property } from 'lit/decorators.js';

import { playbackSource } from '../embed/playback';
import { MaveElement } from '../utils/mave_element';

export class Image extends MaveElement {
  private _token: string;

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

  @property({ type: String, reflect: false })
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

  get poster(): string {
    if (!this.token) return `${this.cdn_root}/${this.embedId}/poster.webp`;
    const source = playbackSource(this.token, this.embed);
    const url = new URL(`${source.media_base_url}/poster.webp`);
    url.searchParams.set('token', source.token);
    return url.toString();
  }

  render() {
    return html`<img src=${this.poster} />`;
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
