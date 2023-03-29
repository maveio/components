import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { Collection } from '../embed/api';
import { EmbedController, EmbedType } from '../embed/controller';

@customElement('mave-list')
export class List extends LitElement {
  @property() embed: string;

  static styles = css`
    :host {
      display: block;
    }
  `;

  private embedController = new EmbedController(this, EmbedType.Collection);
  private _collection: Collection;

  connectedCallback() {
    super.connectedCallback();
    this.embedController.embed = this.embed;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown) {
    super.requestUpdate(name, oldValue);
    if (name === 'embed') {
      this.embedController.embed = this.embed;
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

              if (item.getAttribute('name') == 'list-item') {
                const result = this._collection.embeds.map((embed) => {
                  const template = (item as HTMLTemplateElement).content.cloneNode(
                    true,
                  ) as DocumentFragment;
                  const title = template.querySelector('[slot="item-title"]');
                  if (title) {
                    title.textContent = embed.name;
                    title.removeAttribute('slot');
                  }
                  const player = template.querySelector('[slot="item-player"]');
                  if (player) {
                    player.setAttribute('embed', embed.id);
                    player.removeAttribute('slot');
                  }
                  console.log(template);
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

declare global {
  interface HTMLElementTagNameMap {
    'mave-list': List;
  }
}
