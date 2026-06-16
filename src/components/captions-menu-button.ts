import { MediaCaptionsMenuButton } from 'media-chrome/dist/menu/media-captions-menu-button.js';
import { t } from 'media-chrome/dist/utils/i18n.js';
import { globalThis } from 'media-chrome/dist/utils/server-safe-globals.js';

export class MaveCaptionsMenuButton extends MediaCaptionsMenuButton {
  static getTooltipContentHTML = () => t('Captions');

  connectedCallback(): void {
    super.connectedCallback();
    this.#syncInitialAriaExpanded();
    this.#updateAriaLabel();
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string,
  ): void {
    super.attributeChangedCallback(attrName, oldValue, newValue);
    this.#updateAriaLabel();
  }

  #updateAriaLabel(): void {
    this.setAttribute('aria-label', t('Captions'));
  }

  #syncInitialAriaExpanded(): void {
    if (this.hasAttribute('aria-expanded')) return;

    this.setAttribute(
      'aria-expanded',
      this.invokeTargetElement && !this.invokeTargetElement.hidden ? 'true' : 'false',
    );
  }
}

if (!globalThis.customElements.get('mave-captions-menu-button')) {
  globalThis.customElements.define(
    'mave-captions-menu-button',
    MaveCaptionsMenuButton,
  );
}
