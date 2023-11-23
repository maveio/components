import { css, html, LitElement } from 'lit';
import { query } from 'lit/decorators/query.js';

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
      background: black;
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
      --frame-max-height: 100vh;
      --frame-ratio-w: 16;
      --frame-ratio-h: 9;
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
      width: min(calc(var(--frame-height, 0) * (var(--frame-ratio-w) / var(--frame-ratio-h))), 100%);
      height: 0;
      overflow: hidden;
      background-size: contain;
      background-position: center center;
      background-repeat: no-repeat;
    }
  `;

  open(player: Player) {
    this._player = player;

    const tryToOpen = (resolve: (value: unknown) => void) => {
      this._frame.style.backgroundImage = `url(${player.poster})`;
      this._frame.appendChild(player);

      setTimeout(() => {
        this._dialog.showModal();
      }, 25);

      // Native dialog closing (using escape key)
      this._dialog.addEventListener(
        'cancel',
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
      <dialog>
        <div class="backdrop"></div>
        <div class="content" @click=${this.possibleClose}>
          <div class="wrapper">
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

if (window && window.customElements) {
  if (!window.customElements.get('mave-pop')) {
    window.customElements.define('mave-pop', Pop);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-pop': Pop;
  }
}

const pop = new Pop();

export const checkPop = (element: HTMLElement | ShadowRoot | Document) => {
  if (!document || !document.body) return;
  element.querySelectorAll('[x-mave-pop]').forEach((el) => {
    if (!document.querySelector('mave-pop')) {
      document.body.appendChild(pop);
    }

    const embed = el.getAttribute('x-mave-pop') || el.getAttribute('embed');
    if (!embed) return;
    (el as HTMLElement).style.cursor = 'pointer';

    const player = new Player();
    player.embed = embed;

    // preload image
    const img = new Image();
    img.src = player.poster;

    el.addEventListener('click', (e: Event) => {
      // how does it handle touch events?
      const event = e as MouseEvent;
      event.preventDefault();

      const players = document.querySelectorAll('mave-player');

      const popped = Array.from(players).find(
        (player) => player.popped && player.embed === embed,
      );

      if (!popped) {
        pop.open(player).then(() => {
          player.play();
        });

        pop.addEventListener('closed', () => {
          player.pause();
        });
      }
    });
  });
};

if (document) checkPop(document);
