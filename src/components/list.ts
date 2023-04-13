import './img';

import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { Collection } from '../embed/api';
import { EmbedController, EmbedType } from '../embed/controller';

export class List extends LitElement {
  @property() token: string;

  static styles = css`
    :host {
      display: block;
    }
  `;

  private embedController = new EmbedController(this, EmbedType.Collection);
  private _collection: Collection;

  connectedCallback() {
    super.connectedCallback();
    this.embedController.token = this.token;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown) {
    super.requestUpdate(name, oldValue);
    if (name === 'embed') {
      this.embedController.token = this.token;
    }
  }

  get _slottedChildren() {
    const slot = this.shadowRoot?.querySelector('slot');
    return slot?.assignedElements({ flatten: true }) || [];
  }

  render() {
    return html`
      ${this.embedController.render({
        // TODO: add loading state with loading player UI
        pending: this.renderPending,
        error: (error: unknown) =>
          // TODO: add error state with error player UI
          html`<p>${error instanceof Error ? error.message : nothing}</p>`,
        complete: (data) => {
          this._collection = data as Collection;
          if (!data) return this.renderPending();

          const templates = this._slottedChildren
            .map((item) => {
              if (item.getAttribute('name') == 'list-title') {
                item.textContent = this._collection.name;
                return html`${item}`;
              }

              if (item.nodeName === 'TEMPLATE') {
                const result = this._collection.embeds.map((embed) => {
                  const template = (item as HTMLTemplateElement).content.cloneNode(
                    true,
                  ) as DocumentFragment;
                  const title = template.querySelector('[slot="item-title"]');
                  if (title) {
                    title.textContent = embed.name;
                    title.removeAttribute('slot');
                  }

                  // when clip is provided in the template
                  const clip = template.querySelector('mave-clip');
                  if (clip) {
                    clip.setAttribute('embed', embed.id);
                    clip.removeAttribute('slot');
                  }

                  // when img is provided in the template
                  const img = template.querySelector('mave-img');
                  if (img) {
                    img.setAttribute('embed', embed.id);
                    img.removeAttribute('slot');
                  }
                  return html`${template}`;
                });

                return html`${result}`;
              }
            })
            .filter((t) => t);

          return html` ${templates} `;
        },
      })}
    `;
  }

  renderPending() {
    return html`<slot></slot>`;
  }
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-list')) {
    window.customElements.define('mave-list', List);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-list': List;
  }
}
