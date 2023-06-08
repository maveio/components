import 'media-chrome';
import 'media-chrome/dist/experimental/media-captions-listbox.js';
import 'media-chrome/dist/experimental/media-chrome-listbox.js';
import 'media-chrome/dist/experimental/media-chrome-listitem.js';

import { html, LitElement } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { MediaUIEvents } from 'media-chrome/dist/constants.js';
import MediaCaptionButton from 'media-chrome/dist/media-captions-button.js';
import { areSubsOn, toggleSubsCaps } from 'media-chrome/dist/utils/captions.js';

import style from './main.css';

type Breakpoints = { [propKey: string]: number };

@customElement('mave-theme-main')
export default class Main extends LitElement {
  @query('media-captions-listbox') captionList!: HTMLElement;
  @query('media-captions-button') captionButton!: MediaCaptionButton;
  _captionListOpen = false;
  _currentSelectedOption: string | null = null;

  static styles = style;

  _handleCaptions() {
    this.captionList.style.display = this._captionListOpen ? 'none' : 'block';
    this._captionListOpen = !this._captionListOpen;
  }

  _handleCaptionItem(e: Event) {
    if (e.target && (e.target as HTMLInputElement).value == 'off') {
      if (areSubsOn(this.captionButton)) {
        toggleSubsCaps(this.captionButton);
      }
    } else {
      const selectedOption = (
        (e.target as HTMLInputElement).parentNode as HTMLInputElement
      ).value;

      if (selectedOption && this._currentSelectedOption != selectedOption) {
        if (!areSubsOn(this.captionButton)) {
          toggleSubsCaps(this.captionButton, false);
        }

        this._currentSelectedOption = selectedOption;

        const event = new window.CustomEvent(MediaUIEvents.MEDIA_SHOW_SUBTITLES_REQUEST, {
          composed: true,
          bubbles: true,
          detail: selectedOption,
        });
        this.captionList.dispatchEvent(event);
      }
    }
    this._handleCaptions();
  }

  async firstUpdated() {
    // Give the browser a chance to paint
    await new Promise((r) => setTimeout(r, 0));

    this.captionList.shadowRoot
      ?.querySelectorAll('media-chrome-listitem')
      .forEach((el) => {
        el.addEventListener('click', this._handleCaptionItem.bind(this));
      });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'MEDIA-CHROME-LISTITEM') {
            node.addEventListener('click', this._handleCaptionItem.bind(this));
          }
        });
      });
    });

    const ulElement = this.captionList.shadowRoot?.querySelector('ul');
    if (ulElement) {
      observer.observe(ulElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  render() {
    return html`
      <media-controller>
        <media-captions-listbox style="display: none;"></media-captions-listbox>

        <slot name="media" slot="media"></slot>
        <slot name="poster" slot="poster"></slot>
        <div class="mave-gradient-bottom"></div>

        <div slot="centered-chrome">
          <media-play-button>
            <svg
              slot="play"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#fff"
              stroke="#fff"
              stroke-width="0.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="margin-left: 8px;"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg
              slot="pause"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#fff"
              stroke="#fff"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </media-play-button>
          <media-loading-indicator loading-delay="100"></media-loading-indicator>
        </div>
        <media-control-bar>
          <media-loading-indicator loading-delay="100"></media-loading-indicator>
          <media-play-button class="small-button">
            <svg
              slot="play"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#fff"
              stroke="#fff"
              stroke-width="0.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg
              slot="pause"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#fff"
              stroke="#fff"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </media-play-button>
          <media-seek-forward-button style="display: none;" class="small-button">
            <svg slot="forward" viewBox="0 0 16 16">
              <path
                d="M3.1 13.1c-.1 0-.2 0-.3-.1-.2-.1-.3-.4-.3-.6V3.5c0-.3.1-.5.3-.6.1-.1.4 0 .6.1l6.5 4.4c.2.1.3.3.3.5s-.1.4-.3.5l-6.5 4.4c-.1.3-.2.3-.3.3zM12.8 13.1c-.5 0-.8-.4-.8-.8V3.7c0-.5.4-.8.8-.8.5 0 .8.4.8.8v8.6c.1.4-.3.8-.8.8z"
              />
            </svg>
          </media-seek-forward-button>
          <media-time-display></media-time-display>
          <media-time-range>
            <media-preview-thumbnail slot="preview"></media-preview-thumbnail>
            <media-preview-time-display slot="preview"></media-preview-time-display>
          </media-time-range>
          <media-captions-button
            disabled
            @click=${this._handleCaptions}
            class="small-button"
          >
            <svg
              slot="on"
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              stroke-width="1"
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              color="#fff"
            >
              <path
                d="M1 15V9a6 6 0 016-6h10a6 6 0 016 6v6a6 6 0 01-6 6H7a6 6 0 01-6-6z"
                stroke="#fff"
                fill="#fff"
                stroke-width="1"
              ></path>
              <path
                d="M10.5 10l-.172-.172a2.828 2.828 0 00-2-.828v0A2.828 2.828 0 005.5 11.828v.344A2.828 2.828 0 008.328 15v0c.75 0 1.47-.298 2-.828L10.5 14M18.5 10l-.172-.172a2.828 2.828 0 00-2-.828v0a2.828 2.828 0 00-2.828 2.828v.344A2.828 2.828 0 0016.328 15v0c.75 0 1.47-.298 2-.828L18.5 14"
                stroke="#000"
                fill="#fff"
                stroke-width="1"
                stroke-linecap="round"
              ></path>
            </svg>

            <svg
              slot="off"
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              stroke-width="1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              color="#fff"
            >
              <path
                d="M1 15V9a6 6 0 016-6h10a6 6 0 016 6v6a6 6 0 01-6 6H7a6 6 0 01-6-6z"
                stroke="#fff"
                stroke-width="1"
              ></path>
              <path
                d="M10.5 10l-.172-.172a2.828 2.828 0 00-2-.828v0A2.828 2.828 0 005.5 11.828v.344A2.828 2.828 0 008.328 15v0c.75 0 1.47-.298 2-.828L10.5 14M18.5 10l-.172-.172a2.828 2.828 0 00-2-.828v0a2.828 2.828 0 00-2.828 2.828v.344A2.828 2.828 0 0016.328 15v0c.75 0 1.47-.298 2-.828L18.5 14"
                stroke="#fff"
                stroke-width="1"
                stroke-linecap="round"
              ></path>
            </svg>
          </media-captions-button>
          <div class="media-volume-wrapper">
            <media-mute-button class="small-button">
              <svg
                slot="off"
                class="hidden"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
              <svg
                slot="low"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg
              >-->
              <svg
                slot="medium"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg
              >-->
              <svg
                slot="high"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.1"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path
                  d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                ></path>
              </svg>
            </media-mute-button>
            <div class="media-volume-range-wrapper">
              <media-volume-range></media-volume-range>
            </div>
          </div>
          <media-fullscreen-button class="small-button">
            <svg
              slot="enter"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="feather feather-maximize"
            >
              <path
                d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
              ></path>
            </svg>
            <svg
              slot="exit"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="feather feather-maximize"
            >
              <path
                d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
              ></path>
            </svg>
          </media-fullscreen-button>
        </media-control-bar>
      </media-controller>
    `;
  }
}
