import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

export class Image extends LitElement {
  @property() embed: string;

  static styles = css`
    :host {
      display: block;
    }

    img {
      width: 100%;
      max-height: 100vh;
    }
  `;

  get spaceId(): string {
    return this.embed?.substring(0, 5);
  }

  get embedId(): string {
    return this.embed?.substring(5, this.embed?.length);
  }

  get poster(): string {
    return `https://space-${this.spaceId}.video-dns.com/${this.embedId}/poster.webp`;
  }

  render() {
    return html`<img src=${this.poster} />`;
  }
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-img')) {
    window.customElements.define('mave-img', Image);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-img': Image;
  }
}
