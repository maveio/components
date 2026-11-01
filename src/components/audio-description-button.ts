import { MediaChromeButton } from 'media-chrome/dist/media-chrome-button.js';
import { globalThis as safeGlobal } from 'media-chrome/dist/utils/server-safe-globals.js';

import { msg } from '../utils/localization';

/** Fired (bubbling, composed) with `detail: boolean`, the requested AD state. */
export const AUDIO_DESCRIPTION_REQUEST = 'mave-audio-description-request';

const box = 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z';
const letters =
  'M5.2 16 7.4 8h1.7l2.2 8H9.7l-.45-1.7H7.25L6.8 16H5.2Zm2.45-3.1h1.2l-.6-2.3-.6 2.3Z' +
  'M12.8 8h2.4a3.4 4 0 0 1 0 8h-2.4V8Zm1.5 1.4v5.2h.9a2 2.6 0 0 0 0-5.2h-.9Z';

const audioDescriptionOffIcon = /*html*/ `<svg aria-hidden="true" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="${box}m0 2v12h16V6H4Z${letters}"/>
</svg>`;

const audioDescriptionOnIcon = /*html*/ `<svg aria-hidden="true" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="${box}${letters}"/>
</svg>`;

export class MaveAudioDescriptionButton extends MediaChromeButton {
  static getSlotTemplateHTML = () => /*html*/ `
    <style>
      :host([aria-pressed="true"]) slot[name='off'],
      :host(:not([aria-pressed="true"])) slot[name='on'] {
        display: none !important;
      }
    </style>
    <slot name="icon">
      <slot name="off">${audioDescriptionOffIcon}</slot>
      <slot name="on">${audioDescriptionOnIcon}</slot>
    </slot>
  `;

  static getTooltipContentHTML = () => msg('Audio description');

  get pressed(): boolean {
    return this.getAttribute('aria-pressed') === 'true';
  }

  set pressed(value: boolean) {
    this.setAttribute('aria-pressed', value ? 'true' : 'false');
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('aria-pressed')) this.pressed = false;
    this.#updateLabel();
    safeGlobal.addEventListener?.('lit-localize-status', this.#onLocaleStatus);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();
    safeGlobal.removeEventListener?.('lit-localize-status', this.#onLocaleStatus);
  }

  handleClick(): void {
    this.dispatchEvent(
      new safeGlobal.CustomEvent(AUDIO_DESCRIPTION_REQUEST, {
        detail: !this.pressed,
        composed: true,
        bubbles: true,
      }),
    );
  }

  #onLocaleStatus = (event: Event): void => {
    if ((event as CustomEvent<{ status: string }>).detail?.status === 'ready') {
      this.#updateLabel();
    }
  };

  #updateLabel(): void {
    const label = msg('Audio description');
    this.setAttribute('aria-label', label);
    const tooltip = this.shadowRoot?.querySelector('slot[name="tooltip-content"]');
    if (tooltip) tooltip.textContent = label;
  }
}

if (!safeGlobal.customElements.get('mave-audio-description-button')) {
  safeGlobal.customElements.define(
    'mave-audio-description-button',
    MaveAudioDescriptionButton,
  );
}
