import { MediaUIEvents } from 'media-chrome/dist/constants.js';
import {
  createIndicator,
  createMenuItem,
  MediaChromeMenu,
} from 'media-chrome/dist/menu/media-chrome-menu.js';
import { MediaChromeMenuButton } from 'media-chrome/dist/menu/media-chrome-menu-button.js';
import { t } from 'media-chrome/dist/utils/i18n.js';
import { globalThis } from 'media-chrome/dist/utils/server-safe-globals.js';

type AudioTrackOption = {
  id: string;
  label: string;
  language?: string;
  enabled?: boolean;
};

const audioTrackIcon = /*html*/ `<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M11 17H9.5V7H11v10Zm-3-3H6.5v-4H8v4Zm6-5h-1.5v6H14V9Zm3 7h-1.5V8H17v8Z"/>
  <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Zm-2 0a8 8 0 1 0-16 0 8 8 0 0 0 16 0Z"/>
</svg>`;

export class MaveAudioTrackMenu extends MediaChromeMenu {
  #tracks: AudioTrackOption[] = [];
  #selectedId?: string;

  get tracks(): AudioTrackOption[] {
    return this.#tracks;
  }

  set tracks(value: AudioTrackOption[]) {
    this.#tracks = [...(value ?? [])];
    this.#renderOptions();
  }

  get selected(): string | undefined {
    return this.#selectedId;
  }

  set selected(id: string | undefined) {
    this.#selectedId = id ?? undefined;
    this.#syncSelection();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('change', this.#handleChange);
    this.#renderOptions();
    this.#syncSelection();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('change', this.#handleChange);
  }

  #renderOptions(): void {
    const slot = this.defaultSlot;
    if (!slot) return;
    slot.textContent = '';

    for (const track of this.#tracks) {
      const item = createMenuItem({
        type: 'radio',
        text: track.label ?? track.language ?? '',
        value: track.id,
        checked: !!track.enabled,
      });
      item.prepend(createIndicator(this, 'checked-indicator'));
      slot.append(item);
    }

    this.#syncSelection();
  }

  #syncSelection(): void {
    const enabledTrack =
      this.#tracks.find((track) => track.enabled) ??
      (this.#tracks.length ? this.#tracks[0] : undefined);

    const nextSelectedId = this.#selectedId ?? enabledTrack?.id;
    this.#selectedId = nextSelectedId;

    const slot = this.defaultSlot as HTMLSlotElement | undefined;
    const items =
      slot?.querySelectorAll('media-chrome-menu-item') ??
      this.querySelectorAll('media-chrome-menu-item');

    for (const item of Array.from(items)) {
      if ('checked' in item && 'value' in item) {
        item.checked = item.value === nextSelectedId;
      }
    }

    if (nextSelectedId != null) {
      this.value = nextSelectedId;
    } else {
      this.value = '';
      this.removeAttribute('value');
    }
  }

  #handleChange = (): void => {
    const selectedValue = this.value ?? this.#selectedId;
    if (selectedValue == null) return;

    this.#selectedId = String(selectedValue);

    this.dispatchEvent(
      new globalThis.CustomEvent(MediaUIEvents.MEDIA_AUDIO_TRACK_REQUEST, {
        detail: this.#selectedId,
        composed: true,
        bubbles: true,
      }),
    );
    this.#syncSelection();
  };
}

export class MaveAudioTrackMenuButton extends MediaChromeMenuButton {
  static getSlotTemplateHTML = () => /*html*/ `
    <style>
      :host([aria-expanded="true"]) slot[name='tooltip'] {
        display: none;
      }
    </style>
    <slot name="icon">${audioTrackIcon}</slot>
  `;

  static getTooltipContentHTML = () => t('audio tracks');

  connectedCallback(): void {
    super.connectedCallback();
    this.#updateAriaLabel();
  }

  #updateAriaLabel(): void {
    const label = t('audio tracks');
    this.setAttribute('aria-label', label);
  }

  get invokeTargetElement(): HTMLElement | null {
    if (this.invokeTarget != undefined) return super.invokeTargetElement;
    return (
      this.closest('media-controller, mave-player')?.querySelector(
        'mave-audio-track-menu',
      ) ?? null
    );
  }
}

if (!globalThis.customElements.get('mave-audio-track-menu')) {
  globalThis.customElements.define('mave-audio-track-menu', MaveAudioTrackMenu);
}

if (!globalThis.customElements.get('mave-audio-track-menu-button')) {
  globalThis.customElements.define(
    'mave-audio-track-menu-button',
    MaveAudioTrackMenuButton,
  );
}
