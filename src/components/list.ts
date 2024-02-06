import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { Collection } from '../embed/api';
import { EmbedController, EmbedType } from '../embed/controller';
import { checkPop } from './pop.js';

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

  get _stylesheets() {
    if (document) {
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      return html`${Array.from(styles).map((style) => style.cloneNode(true))}`;
    } else {
      return null;
    }
  }

  updated() {
    if (this.shadowRoot) {
      checkPop(this.shadowRoot);
    }
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
              function createClone() {
                let clone: DocumentFragment;
                if (item.nodeName === 'TEMPLATE') {
                  clone = (item as HTMLTemplateElement).content.cloneNode(
                    true,
                  ) as DocumentFragment;
                } else {
                  clone = item.cloneNode(true) as DocumentFragment;
                }
                return clone;
              }

              if (item.getAttribute('name') == 'list-title') {
                const template = createClone();

                template.textContent = this._collection?.name;
                return html`${template}`;
              }

              if (item.getAttribute('name') == 'mave-list-root' && this.embedController.embed) {
                const template = createClone();
                const link = template.querySelector('[slot="root-link"]');
                if (link) {
                  link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.embedController.embed = '';
                  });
                  link.removeAttribute('slot');
                }
                return html`${template}`;
              }

              if (item.getAttribute('name') == 'mave-list-folder') {
                const result = this._collection.collections?.map((collection) => {
                  const template = createClone();

                  const link = template.querySelector('[slot="folder-link"]');

                  [item, link].forEach((element) => {
                    if (element) {
                      element.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.embedController.embed = collection.id;
                      });
                      element.removeAttribute('slot');
                    }
                  });

                  this.#setTextContent(template, '[slot="folder-title"]', collection.name);
                  if (typeof collection.video_count == 'number') {
                    this.#setTextContent(template, '[slot="folder-count"]', collection.video_count.toString());
                  }

                  return html`${template}`;
                });

                return html`${result}`;
              }


              if (item.getAttribute('name') == 'mave-list-item' || (!item.hasAttribute('name') && item.nodeName == 'template')) {

                const result = this._collection.videos?.map((video) => {
                  const template = createClone();

                  this.#setTextContent(template, '[slot="item-title"]', video.name);
                  this.#setEmbedAttribute(template, 'mave-clip', video.id);
                  this.#setEmbedAttribute(template, 'mave-player', video.id);
                  this.#setEmbedAttribute(template, 'mave-img', video.id);
                  return html`${template}`;
                });

                return html`${result}`;
              }

            })
            .filter((t) => t);

          return html`${this._stylesheets} ${templates} `;
        },
      })}
    `;
  }

  #setEmbedAttribute(template: DocumentFragment, selector: string, embed: string) {
    const element = template.querySelector(selector);
    if (!element) return;
    element.setAttribute('embed', embed);
    element.removeAttribute('slot');
  }

  #setTextContent(template: DocumentFragment, selector: string, text: string) {
    const element = template.querySelector(selector);
    if (!element) return;
    element.textContent = text;
    element.removeAttribute('slot');
  }

  renderPending() {
    return html`<slot style="display: none"></slot>`;
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
