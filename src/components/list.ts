import { msg } from '@lit/localize';
import { css, html, nothing, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { guard } from 'lit/directives/guard.js';
import { repeat } from 'lit/directives/repeat.js';

import { Collection, Video } from '../embed/api';
import { EmbedController, EmbedType } from '../embed/controller';
import { MaveElement } from '../utils/mave_element';
import { checkPop } from './pop.js';

export class List extends MaveElement {
  private _token: string;
  @property({ reflect: false })
  get token(): string {
    return this._token;
  }

  set token(value: string) {
    if (this._token !== value) {
      this.resetPages();
      this._token = value;
      this.embedController.token = value;
      this.requestUpdate('token');
    }
  }
  @property() order?: 'oldest' | 'newest' | 'az' | 'za' = 'newest';

  static styles = css`
    :host {
      display: block;
    }

    [part='pagination'] {
      grid-column: 1 / -1;
      padding-block: 0.5rem;
    }
  `;

  private embedController = new EmbedController(this, EmbedType.Collection);
  private firstPage?: Collection;
  private _collection?: Collection;
  private nextPageRequest?: AbortController;
  private nextPageFailed = false;

  connectedCallback() {
    super.connectedCallback();
    this.embedController.token = this.token;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.nextPageRequest?.abort();
    this.nextPageRequest = undefined;
  }

  protected willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (changed.has('order') || !this.embedController.collectionOrder) {
      this.resetPages();
      this.embedController.collectionOrder = this.order || 'newest';
    }
  }

  get _slottedChildren() {
    const slot = this.shadowRoot?.querySelector('slot');
    return slot?.assignedElements({ flatten: true }) ?? Array.from(this.children);
  }

  updated() {
    if (this.shadowRoot) {
      checkPop(this.shadowRoot);
    }
  }

  refresh(): Promise<unknown> {
    this.resetPages();
    return this.embedController.refresh();
  }

  containsEmbed(embedId: string): boolean {
    return this._collection?.videos?.some((video) => video.id === embedId) ?? false;
  }

  getNextForEmbed(embedId: string) {
    const videos = this.#getVideos();
    const index = videos.findIndex((video) => video.id === embedId);
    if (index === -1) return;
    return videos[index + 1];
  }

  private showCollection(embed: string) {
    this.resetPages();
    this.embedController.embed = embed;
  }

  private resetPages() {
    this.nextPageRequest?.abort();
    this.nextPageRequest = undefined;
    this.nextPageFailed = false;
    this.firstPage = undefined;
    this._collection = undefined;
  }

  private async loadMore() {
    const collection = this._collection;
    if (!collection?.has_more || this.nextPageRequest) return;

    const request = new AbortController();
    this.nextPageRequest = request;
    this.nextPageFailed = false;
    this.requestUpdate();

    try {
      const page = (collection.current_page ?? 1) + 1;
      const result = await this.embedController.fetchCollectionPage(page, request.signal);
      if (request.signal.aborted) return;
      if (result.current_page !== page) throw new Error('Unexpected collection page');

      const existingIds = new Set(collection.videos.map((video) => video.id));
      this._collection = {
        ...collection,
        ...result,
        videos: [
          ...collection.videos,
          ...result.videos.filter((video) => !existingIds.has(video.id)),
        ],
      };
    } catch {
      if (!request.signal.aborted) this.nextPageFailed = true;
    } finally {
      if (this.nextPageRequest === request) {
        this.nextPageRequest = undefined;
        this.requestUpdate();
      }
    }
  }

  private async onMoreClick(event: Event) {
    const trigger =
      event.target instanceof Element &&
      event.target.closest('[slot="more-link"], [data-slot="more-link"]');
    if (!trigger) return;

    event.preventDefault();
    if (this.nextPageRequest || trigger.getAttribute('aria-disabled') === 'true') return;

    trigger.setAttribute('aria-disabled', 'true');
    try {
      await this.loadMore();
    } finally {
      trigger.removeAttribute('aria-disabled');
    }
  }

  render() {
    return html`
      ${this.embedController.render({
        pending: this.renderPending,
        error: () => this.renderError(),
        complete: (data) => {
          const collection = data as Collection & { error?: unknown };
          if (!data) return this.renderPending();
          if (collection.error) return this.renderError();
          if (this.firstPage !== collection) {
            this.firstPage = collection;
            this._collection = collection;
          }
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

              if (item.getAttribute('name') === 'mave-list-more') {
                if (!this._collection?.has_more) return nothing;

                const state = this.nextPageRequest
                  ? 'loading'
                  : this.nextPageFailed
                    ? 'error'
                    : 'idle';

                return html`
                  <div
                    part="pagination"
                    data-state=${state}
                    aria-busy=${state === 'loading'}
                    @click=${this.onMoreClick}
                  >
                    ${guard([item], () => createClone())}
                  </div>
                `;
              }

              if (item.getAttribute('name') == 'list-title') {
                const template = createClone();

                template.textContent = this._collection?.name ?? '';
                return html`${template}`;
              }

              if (
                item.getAttribute('name') == 'mave-list-root' &&
                this.embedController.embed
              ) {
                const template = createClone();
                const link = this.#querySlotElement(template, 'root-link');
                if (link) {
                  link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.emit(this.EVENT_TYPES.CLICK, { action: 'back', embedId: '' });
                    this.showCollection('');
                  });
                  this.#clearSlotAttributes(link);
                }
                return html`${template}`;
              }

              if (item.getAttribute('name') == 'mave-list-folder') {
                const result = this._collection?.collections?.map((collection) => {
                  const template = createClone();

                  const link =
                    this.#querySlotElement(template, 'folder-link') ??
                    (template instanceof Element ? template : template.firstElementChild);

                  if (link) {
                    link.addEventListener('click', (e) => {
                      e.preventDefault();
                      this.emit(this.EVENT_TYPES.CLICK, {
                        action: 'show_collection',
                        collectionId: collection.id,
                      });
                      this.showCollection(collection.id);
                    });
                    this.#clearSlotAttributes(link);
                  }

                  this.#setTextContent(template, 'folder-title', collection.name);
                  if (typeof collection.video_count == 'number') {
                    this.#setTextContent(
                      template,
                      'folder-count',
                      collection.video_count.toString(),
                    );
                  }

                  return html`${template}`;
                });

                return html`${result}`;
              }

              if (
                item.getAttribute('name') == 'mave-list-item' ||
                (![
                  'mave-list-folder',
                  'mave-list-item',
                  'mave-list-root',
                  'list-title',
                ].includes(item.hasAttribute('name') ? item.getAttribute('name')! : '') &&
                  item.nodeName == 'TEMPLATE')
              ) {
                const result = repeat(
                  this.#getVideos(),
                  (video) => video.id,
                  (video, index) =>
                    guard([item, video, index], () => {
                      const template = createClone();
                      const position = index + 1;

                      this.#setTextContent(template, 'item-title', video.name);
                      this.#setTextContent(
                        template,
                        'item-position',
                        position.toString(),
                      );
                      this.#setTextContent(
                        template,
                        'item-duration',
                        this.durationToTime(video.duration),
                      );
                      this.#setEmbedAttribute(template, 'mave-clip', video.id);
                      this.#setEmbedAttribute(template, 'mave-player', video.id);
                      this.#setEmbedAttribute(template, 'mave-img', video.id);

                      const clip = template.querySelector('mave-clip');
                      const title = this.#querySlotElement(template, 'item-title');
                      const img = template.querySelector('mave-img');

                      [clip, title, img, template].forEach(
                        (el: Element | DocumentFragment | null) => {
                          el?.addEventListener('click', () => {
                            this.emit(this.EVENT_TYPES.CLICK, {
                              action: 'show_embed',
                              embedId: video.id,
                              position,
                            });
                          });
                        },
                      );
                      return html`${template}`;
                    }),
                );

                return html`${result}`;
              }
            })
            .filter((t) => t);

          return html`${this._stylesheets} ${templates}`;
        },
      })}
    `;
  }

  private renderError() {
    return html`
      <div part="pagination">
        <p role="alert">${msg('Could not load videos.')}</p>
        <button type="button" @click=${this.refresh}>${msg('Try again')}</button>
      </div>
    `;
  }

  #getVideos(): Video[] {
    const collection = this._collection;
    if (!collection) return [];
    const videos = collection.videos ?? [];
    if (collection.current_page !== undefined) return videos;

    if (this.order == 'newest') {
      return [...videos].sort((a, b) => {
        return b.created - a.created;
      });
    }
    if (this.order == 'oldest') {
      return [...videos].sort((a, b) => {
        return a.created - b.created;
      });
    }
    if (this.order == 'az') {
      return [...videos].sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    }
    if (this.order == 'za') {
      return [...videos].sort((a, b) => {
        return b.name.localeCompare(a.name);
      });
    }
    return videos;
  }

  #setEmbedAttribute(template: DocumentFragment, selector: string, embed: string) {
    const element = template.querySelector(selector);
    if (!element) return;
    element.setAttribute('embed', embed);
    this.#clearSlotAttributes(element);
  }

  #setTextContent(template: DocumentFragment, slotName: string, text: string) {
    const element = this.#querySlotElement(template, slotName);
    if (!element) return;
    element.textContent = text;
    this.#clearSlotAttributes(element);
  }

  #querySlotElement(root: DocumentFragment | Element, slotName: string) {
    return root.querySelector(`[slot="${slotName}"], [data-slot="${slotName}"]`);
  }

  #clearSlotAttributes(element?: Element | null) {
    if (!element) return;
    element.removeAttribute('slot');
    element.removeAttribute('data-slot');
  }

  renderPending() {
    return html`
      <slot style="display: none"></slot>
      <p role="status" part="pagination">${msg('Loading videos…')}</p>
    `;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-list')) {
    window.customElements.define('mave-list', List);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-list': List;
  }
}
