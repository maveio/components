import { css, html, LitElement, nothing } from 'lit';
import { query } from 'lit/decorators/query.js';

import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Collection } from '../embed/api';
import { EmbedController, EmbedType } from '../embed/controller';
import { Player } from './player.js';

export class Pop extends LitElement {
  @query('dialog') _dialog: HTMLDialogElement;
  @query('.content') _content: HTMLElement;
  @query('.frame') _frame: HTMLElement;
  @query('.backdrop') _backdrop: HTMLElement;

  private _player?: Player;
  private embedController = new EmbedController(this, EmbedType.Collection);
  private _collection: Collection;

  static styles = css`
    :host {
      all: initial;
      --backdrop: black;
      --frame-max-height: 100vh;
      --frame-ratio-w: 16;
      --frame-ratio-h: 9;
      --backdrop-filter: blur(0);
    }

    slot {
      all: initial;
      position: fixed;
    }

    dialog {
      display: block;
      margin: 0;
      padding: 0;
      border: 0;
      pointer-events: none;
      background: transparent;
    }

    dialog .content {
      position: fixed;
      width: 100vw;
      height: 100vh;
      top: 0;
      left: 0;
      opacity: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: scale(0.96);
      transition-property: transform, opacity;
      transition-duration: 200ms;
      transition-timing-function: ease-out;
    }

    .backdrop {
      position: fixed;
      background: var(--backdrop);
      backdrop-filter: var(--backdrop-filter);
      opacity: 0;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      transition-property: opacity;
      transition-duration: 200ms;
      transition-timing-function: ease-out;
    }

    dialog[open] .backdrop {
      opacity: 1;
    }

    dialog::backdrop {
      background: none;
    }

    dialog[open] {
      pointer-events: auto;
    }

    dialog[open] .content {
      opacity: 1;
      transform: scale(1);
    }

    dialog[open] .button-close {
      display: block;
    }

    dialog[closed] slot {
      display: block;
    }

    dialog[open] slot {
      display: block;
    }

    .button-close {
      display: none;
      position: fixed;
      top: 0.8rem;
      right: 0.6rem;
      width: 2.75rem;
      height: 2.75rem;
      transition-property: transform;
      transition-duration: 100ms;
      transition-timing-function: ease-out;
    }

    .button-close:hover {
      cursor: pointer;
      transform: scale(1.3);
    }

    .button-close svg {
      color: white;
      width: 2.75rem;
      height: 2.75rem;
      transform: rotate(45deg);
    }

    .wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      max-width: 100vw;
      max-height: var(--frame-max-height);
    }

    .frame {
      --ratio: calc(var(--frame-ratio-h, 1) / var(--frame-ratio-w, 1) * 100%);
      --frame-height: min(var(--ratio), var(--frame-max-height));
      position: relative;
      padding-bottom: var(--frame-height);
      width: min(
        calc(var(--frame-height, 0) * (var(--frame-ratio-w) / var(--frame-ratio-h))),
        100%
      );
      height: 0;
      overflow: hidden;
      background-size: contain;
      background-position: center center;
      background-repeat: no-repeat;
    }

    .frame_multiple {
      width: 24rem;
      padding-bottom: 0;
      height: 75vh;
      margin-bottom: 4.75rem;
    }

    slot {
      position: fixed;
      color: white;
      bottom: 10px;
    }
  `;

  @property() token?: string;

  private _backdropColor: string;
  @property()
  get backdrop(): string {
    const backdrop = this._backdropColor || 'black';
    return backdrop;
  }
  set backdrop(value: string) {
    if (this._backdropColor != value) {
      this._backdropColor = value;
    }
  }

  private _backdropFilter: string;
  @property({ attribute: 'backdrop-filter' })
  get backdropFilter(): string {
    const backdrop = this._backdropFilter;
    return backdrop;
  }
  set backdropFilter(value: string) {
    if (this._backdropFilter != value) {
      this._backdropFilter = value;
    }
  }

  get styles() {
    const style = {
      '--backdrop': this.backdrop,
      '--backdrop-filter': this.backdropFilter,
    };
    return styleMap(style);
  }

  get _slottedChildren() {
    const slot = this.shadowRoot?.querySelector('slot');
    return slot?.assignedElements({ flatten: true }) || [];
  }

  _nextPreviousSet = false;
  _opened = false;

  _touchStartX: number = 0;
  _touchEndX: number = 0;

  connectedCallback() {
    super.connectedCallback();
    if (this.token) this.embedController.token = this.token;
    if (window) {
      window.addEventListener('keydown', this.keyPressed.bind(this));
    }
  }

  keyPressed(e: KeyboardEvent) {
    const index = this._collection.videos.findIndex(
      (video) => video.id === this._player?.embed,
    );

    if (this._opened) {
      if (e.key === 'ArrowRight' && index < this._collection.videos.length - 1) {
        this.playNextOrPrevious(1);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        this.playNextOrPrevious(-1);
      }
    }
  }

  handleSwipe() {
    const swipeThreshold = 50; // Minimum distance in pixels for a swipe to be counted
    const swipeDistance = this._touchStartX - this._touchEndX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe left, go to the next video
        this.playNextOrPrevious(1);
      } else {
        // Swipe right, go to the previous video
        this.playNextOrPrevious(-1);
      }
    }
  }

  findInSlotted(selector: string, tagNameCheck?: string): Element | null {
    for (const child of this._slottedChildren) {
      if (
        child.matches(selector) ||
        (tagNameCheck && child.tagName === tagNameCheck.toUpperCase())
      ) {
        return child;
      }

      const found = child.querySelector(selector);
      if (found) {
        return found;
      }
    }
    return null;
  }

  playNextOrPrevious(direction: number) {
    const currentIndex = this._collection.videos.findIndex(
      (video) => video.id === this._player?.embed,
    );

    const newIndex =
      (currentIndex + direction + this._collection.videos.length) %
      this._collection.videos.length;
    const newEmbed = this._collection.videos[newIndex].id;

    this._player?.setAttribute('embed', newEmbed);
    this._player?.play();

    const currentIndexElement = this.findInSlotted('[name="mave-current-index"]');
    if (currentIndexElement) {
      currentIndexElement.textContent = (newIndex + 1).toString();
    }

    this.nextPreviousStyle(newIndex);
  }

  nextPreviousStyle(index: number) {
    const previous = this.findInSlotted('[name="mave-pop-previous"]') as HTMLElement;
    const next = this.findInSlotted('[name="mave-pop-next"]') as HTMLElement;
    if (next && previous) {
      if (index == 0) {
        previous.style.opacity = '0.5';
        previous.style.pointerEvents = 'none';
      } else {
        previous.style.opacity = '1';
        previous.style.pointerEvents = 'auto';
      }

      if (index == this._collection.videos.length - 1) {
        next.style.opacity = '0.5';
        next.style.pointerEvents = 'none';
      } else {
        next.style.opacity = '1';
        next.style.pointerEvents = 'auto';
      }
    }
  }

  open(player: Player) {
    let hasPlayer = false;
    const playerElement = this.findInSlotted('mave-player', 'mave-player');

    if (player.aspect_ratio) {
      const [w, h] = player.aspect_ratio.split('/');
      this.style.setProperty('--frame-ratio-w', w);
      this.style.setProperty('--frame-ratio-h', h);
    }

    this.style.display = 'block';

    if (playerElement) {
      hasPlayer = true;
      this._frame.style.display = 'none';
      for (const attr of player.attributes) {
        playerElement.setAttribute(attr.name, attr.value);
      }
      this._player = playerElement as Player;
    }

    if (!hasPlayer) {
      this._frame.appendChild(player);
      this._player = player;
    }

    const tryToOpen = (resolve: (value: unknown) => void) => {
      if (this.token) {
        this._frame.classList.add('frame_multiple');

        const next = this.findInSlotted('[name="mave-pop-next"]');
        const previous = this.findInSlotted('[name="mave-pop-previous"]');
        const folderCount = this.findInSlotted('[name="mave-folder-count"]');
        const currentIndex = this.findInSlotted('[name="mave-current-index"]');

        if (!this._nextPreviousSet) {
          next?.addEventListener('click', () => {
            this.playNextOrPrevious(1);
          });

          previous?.addEventListener('click', () => {
            this.playNextOrPrevious(-1);
          });
          this._nextPreviousSet = true;
        }

        if (folderCount) {
          folderCount.textContent = this._collection.videos.length.toString();
        }

        if (currentIndex) {
          const index = this._collection.videos.findIndex(
            (video) => video.id === this._player?.embed,
          );
          currentIndex.textContent = (index + 1).toString();
          this.nextPreviousStyle(index);
        }
      }

      setTimeout(() => this._dialog.showModal(), 25);

      this._dialog.addEventListener(
        'close',
        (e) => {
          e.preventDefault();
          this.close();
        },
        { once: true },
      );

      this.addEventListener('touchstart', this.touchStart.bind(this), { passive: true });
      this.addEventListener('touchend', this.touchEnd.bind(this), { passive: true });

      this._opened = true;

      resolve(this._player);
    };

    return new Promise((resolve) => {
      if (!this._dialog) {
        const interval = setInterval(() => {
          if (this._dialog) {
            tryToOpen(resolve);
            clearInterval(interval);
          }
        }, 100);
        return;
      } else {
        tryToOpen(resolve);
      }
    });
  }

  touchStart(e: TouchEvent) {
    this._touchStartX = e.touches[0].clientX;
  }

  touchEnd(e: TouchEvent) {
    this._touchEndX = e.changedTouches[0].clientX;
    this.handleSwipe();
  }

  possibleClose(e: MouseEvent) {
    if (e.target instanceof HTMLElement && !e.target.closest('dialog')) return;
    if (e.target != this._player) this.close();
  }

  close() {
    this._dialog.close();

    this._backdrop.addEventListener(
      'transitionend',
      () => {
        this._frame.innerHTML = '';

        if (this._player) {
          this._player.pause();
          this._player.currentTime = 0;
        }

        const detail = {
          player: this._player,
        };
        this.dispatchEvent(new CustomEvent('closed', { bubbles: true, detail }));
      },
      { once: true },
    );

    this.removeEventListener('touchstart', this.touchStart.bind(this));
    this.removeEventListener('touchend', this.touchEnd.bind(this));

    this._opened = false;
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.keyPressed.bind(this));
  }

  render() {
    return html`
      ${this.token
        ? this.embedController.render({
            complete: (data: any) => {
              this._collection = data as Collection;
              if (data.error) return console.warn(data.error);
            },
          })
        : nothing}

      <dialog style=${this.styles}>
        <div class="backdrop"></div>
        <div class="content" @click=${this.possibleClose}>
          <div class="wrapper">
            <slot></slot>
            <div class="frame"></div>
          </div>
        </div>
        <div class="button-close" @click=${this.close}>
          <svg
            width="24px"
            height="24px"
            stroke-width="1"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            color="currentColor"
          >
            <path
              d="M6 12h6m6 0h-6m0 0V6m0 6v6"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </svg>
        </div>
      </dialog>
    `;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-pop')) {
    window.customElements.define('mave-pop', Pop);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-pop': Pop;
  }
}

function getAllAttributesAsObject(element?: Element): Record<string, string> {
  const attributesObject: Record<string, string> = {};

  if (!element) return attributesObject;

  for (let i = 0; i < element.attributes.length; i++) {
    const attribute = element.attributes[i];
    attributesObject[attribute.name] = attribute.value;
  }
  return attributesObject;
}

const getDocument = () => (typeof document !== 'undefined' ? document : undefined);

export const checkPop = (element: HTMLElement | ShadowRoot | Document): void => {
  const doc = getDocument();
  if (!doc) return;
  const activeDoc = doc;

  function findOrCreatePop(embed: string): {
    pop: Pop;
    attributes?: Record<string, string>;
  } {
    let pop: Pop;
    let attributes: Record<string, string> | undefined;

    const existingPop = activeDoc.querySelector(`mave-pop[embed="${embed}"]`);
    if (existingPop) {
      attributes = getAllAttributesAsObject(existingPop.querySelector(`mave-player`)!);
      pop = existingPop as Pop;
      return { pop, attributes };
    }

    const unnamedPop = activeDoc.querySelector('mave-pop:not([embed])');
    if (unnamedPop) {
      attributes = getAllAttributesAsObject(unnamedPop.querySelector('mave-player')!);
      pop = unnamedPop as Pop;
      return { pop, attributes };
    }

    pop = new Pop();
    activeDoc.body.appendChild(pop as unknown as Node);
    return { pop };
  }

  function createPlayer(embed: string, attributes?: Record<string, string>): Player {
    const player = new Player();
    if (attributes) {
      for (const key in attributes) {
        player.setAttribute(key, attributes[key]);
      }
    }
    player.embed = embed;
    player.setAttribute('embed', embed);
    return player;
  }

  function processElements(element: HTMLElement | ShadowRoot | Document) {
    element.querySelectorAll('[x-mave-pop]').forEach((el) => {
      const embed = el.getAttribute('x-mave-pop') || el.getAttribute('embed');
      if (!embed) return;

      const { pop, attributes } = findOrCreatePop(embed);

      createPlayer(embed, attributes);

      el.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const players = activeDoc.querySelectorAll('mave-player');
        const popped = Array.from(players).find((player) => (player as Player).popped);

        if (!popped) {
          const player = createPlayer(embed, attributes);

          pop.open(player).then((p) => {
            (p as Player).play();
          });

          pop.addEventListener('closed', (event: Event) => {
            const customEvent = event as CustomEvent;
            const player = customEvent.detail.player as Player;
            player.pause();
            player.currentTime = 0;
          });
        }
      });
    });
  }

  processElements(element);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            processElements(node);
          }
        });
      }
    }
  });

  observer.observe(activeDoc.body, { childList: true, subtree: true });
};

const docForInit = getDocument();
if (docForInit) {
  if (docForInit.readyState === 'loading') {
    docForInit.addEventListener('DOMContentLoaded', () => {
      checkPop(docForInit);
    });
  } else {
    setTimeout(() => checkPop(docForInit), 500);
  }
}
