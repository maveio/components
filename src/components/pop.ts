import { css, html, LitElement } from 'lit';
import { query } from 'lit/decorators/query.js';

import { Player } from './player.js';

export class Pop extends LitElement {
  @query('dialog') _dialog: HTMLDialogElement;
  @query('.content') _content: HTMLElement;
  @query('.backdrop') _backdrop: HTMLElement;

  private _player?: Player;

  static styles = css`
    :host {
      all: initial;
    }

    dialog {
      display: block;
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
      background-size: contain;
      background-position: center center;
      background-repeat: no-repeat;
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

    .button-close {
      position: fixed;
      top: 0.8rem;
      right: 0.6rem;
      width: 2.75rem;
      height: 2.75rem;
      transition-property: transform;
      transition-duration: 100ms;
      transition-timing-function: ease-out:
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
  `;

  open(player: Player) {
    this._player = player;

    const tryToOpen = (resolve: (value: unknown) => void) => {
      this._content.style.backgroundImage = `url(${player.poster})`;
      this._content.appendChild(player);

      setTimeout(() => {
        this._dialog.showModal();
      }, 25);

      // Disable scroll on parent
      document.documentElement.style.overflow = 'hidden';

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
        this.dispatchEvent(new Event('closed', { bubbles: true }));

        // Enable scroll on parent
        document.documentElement.style.overflow = 'scroll';
      },
      { once: true },
    );
  }

  render() {
    return html`
      <dialog>
        <div class="backdrop"></div>
        <div class="content" @click=${this.possibleClose}></div>
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
