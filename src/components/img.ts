import { css, html } from 'lit';
import { MaveElement } from '../utils/mave_element';

export class Image extends MaveElement {
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
    return `${this.cdn_root}/${this.embedId}/poster.webp`;
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
