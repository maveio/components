import { css, html, LitElement } from 'lit';
import { query } from 'lit/decorators/query.js';

import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Player } from './player.js';

export class Pop extends LitElement {
  @query('dialog') _dialog: HTMLDialogElement;
  @query('.content') _content: HTMLElement;
  @query('.frame') _frame: HTMLElement;
  @query('.backdrop') _backdrop: HTMLElement;

  private _player?: Player;

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
  `;

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

  open(player: Player) {
    this._player = player;
    if (player.aspect_ratio) {
      const [w, h] = player.aspect_ratio.split('/');
      this.style.setProperty('--frame-ratio-w', w);
      this.style.setProperty('--frame-ratio-h', h);
    }

    this.style.display = 'block';

    const tryToOpen = (resolve: (value: unknown) => void) => {
      this._frame.appendChild(player);

      setTimeout(() => {
        this._dialog.showModal();
      }, 25);

      this._dialog.addEventListener(
        'close',
        (e) => {
          e.preventDefault();
          this.close();
        },
        { once: true },
      );

      resolve(this);
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

  possibleClose(e: MouseEvent) {
    if (e.target != this._player) this.close();
  }

  close() {
    this._dialog.close();

    this._backdrop.addEventListener(
      'transitionend',
      () => {
        this._frame.innerHTML = '';
        this.dispatchEvent(new Event('closed', { bubbles: true }));
      },
      { once: true },
    );
  }

  render() {
    return html`
      <dialog style=${this.styles}>
        <div class="backdrop"></div>
        <div class="content" @click=${this.possibleClose}>
          <div class="wrapper">
            <slot style="display: none;"></slot>
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

          pop.open(player).then(() => {
            player.play();
          });

          pop.addEventListener('closed', () => {
            player.pause();
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
