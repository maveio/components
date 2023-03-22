import 'media-chrome';

import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

type Breakpoints = { [propKey: string]: number };

@customElement('mave-theme-main')
export default class Main extends LitElement {
  private _breakpoints: Breakpoints = { xs: 360, sm: 600, md: 760, lg: 960, xl: 1100 };

  private getBreakpoints(rect: DOMRect) {
    return Object.keys(this._breakpoints).filter((key: string) => {
      return rect.width >= this._breakpoints[key];
    });
  }

  static styles = css`
    :host {
      display: flex;

      --primary-color: transparent;
      --secondary-color: transparent;
      --tertiary-color: transparent;

      -webkit-font-smoothing: antialiased;
    }

    media-controller {
      width: 100%;
      aspect-ratio: 16 / 9;
      margin: 0;
      padding: 0;

      --media-icon-color: transparent;

      --media-control-background: transparent;
      --media-control-hover-background: transparent;

      --media-range-track-height: 1px;
      --media-range-track-background: rgba(255, 255, 255, 0.1);
      --media-range-track-pointer-background: rgba(255, 255, 255, 0.25);

      --media-range-thumb-background: transparent;
      --media-range-thumb-width: 20px;
      --media-range-thumb-height: 20px;

      --media-range-thumb-transform: scale(0);

      --media-range-thumb-transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);

      --media-preview-time-margin: 0;
    }

    media-loading-indicator {
      --media-icon-color: rgba(255, 255, 255, 1);
    }

    media-controller[media-is-fullscreen] {
      aspect-ratio: auto;
    }

    media-control-bar {
      position: relative;
      margin: 0;
      padding: 0 6px 2px 4px;
    }

    .small-button {
      position: relative;
      flex: none;
      display: flex;
      height: 48px;
      width: 48px;
      opacity: 0.95;
      transition-property: transform;
      transform-origin: center;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 100ms;
    }

    .small-button:hover {
      opacity: 1;
      transform: scale(1.25);
    }

    .small-button svg {
      position: absolute;
      overflow: hidden;
      width: 100%;
      height: 25px;
      margin: 0 !important;
      padding: 0 !important;
      transform: translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)
        rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y))
        scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
    }

    media-play-button.small-button svg {
      --media-icon-color: white;
    }

    media-mute-button.small-button svg {
      height: 28px;
    }

    media-fullscreen-button.small-button svg {
      height: 24px;
    }

    media-time-range {
      height: 48px;
      margin: 0 -8px 0 -2px;
      opacity: 0.5;
    }

    media-time-range:hover {
      opacity: 1;
      --media-range-thumb-transform: scale(1);
      --media-range-thumb-background: #fff;
    }

    media-time-range span {
      margin-bottom: -20px;
    }

    media-volume-range {
      height: 100%;
      --media-range-thumb-width: 16px;
      --media-range-thumb-height: 16px;
      --media-range-thumb-background: #fff;
      --media-range-thumb-transform: scale(1);
    }

    media-volume-range:hover {
      height: 100%;
      --media-range-thumb-width: 16px;
      --media-range-thumb-height: 16px;
    }

    media-time-display {
      margin: 0 0 0 -8px;
      padding: 0 !important;
      min-width: 56px;
    }

    media-time-display,
    media-preview-time-display {
      letter-spacing: 0.005rem;
      opacity: 0.9;
      font-size: 14px;
      font-family: Sofia, sans-serif;
    }

    media-preview-time-display {
      display: none;
    }

    .mave-gradient-bottom {
      position: absolute;
      width: 100%;
      height: 50px;
      bottom: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 100%);
    }

    div[slot='centered-chrome'] {
      pointer-events: none;
    }

    div[slot='top-chrome'] {
      width: 100%;
      display: flex;
      padding: 0;
      flex-direction: row-reverse;
    }

    div[slot='top-chrome'] .small-button {
      margin: 7px;
    }

    .media-volume-wrapper {
      position: relative;
      padding-left: 6px;
    }

    .media-volume-range-wrapper {
      width: 122px;
      height: 34px;
      overflow: hidden;
      opacity: 0;
      transform: rotate(-90deg);
      position: absolute;
      top: -70px;
      left: -40px;
      border-left: 16px solid transparent;
    }

    media-volume-range {
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.5);
      --media-range-track-width: 80px;
    }

    media-mute-button:hover + .media-volume-range-wrapper,
    media-mute-button:focus + .media-volume-range-wrapper,
    media-mute-button:focus-within + .media-volume-range-wrapper,
    .media-volume-range-wrapper:hover,
    .media-volume-range-wrapper:focus,
    .media-volume-range-wrapper:focus-within {
      opacity: 1;
    }

    media-airplay-button[media-airplay-unavailable].small-button {
      display: none;
    }

    media-cast-button[media-cast-unavailable].small-button {
      display: none;
    }

    media-pip-button[media-pip-unavailable].small-button {
      display: none;
    }

    media-captions-button.small-button {
      display: none;
    }

    media-captions-button[media-captions-list].small-button {
      display: flex;
    }

    media-captions-button[media-subtitles-list].small-button {
      display: flex;
    }
  `;

  render() {
    return html`
      <media-controller>
        <slot name="media" slot="media"></slot>
        <slot name="poster" slot="poster"></slot>
        <div class="mave-gradient-bottom"></div>
        <div slot="top-chrome">
          <media-cast-button class="small-button">
            <svg
              slot="enter"
              width="24px"
              height="24px"
              stroke="#fff"
              stroke-width="1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              color="#fff"
            >
              <path
                d="M6 17H3V4h18v13h-3"
                stroke="#fff"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
              <path
                d="M8.622 19.067L11.5 14.75a.6.6 0 01.998 0l2.88 4.318a.6.6 0 01-.5.933H9.12a.6.6 0 01-.5-.933z"
                stroke="#fff"
                stroke-width="1"
              ></path>
            </svg>
            <svg
              slot="exit"
              width="24px"
              height="24px"
              stroke="#fff"
              stroke-width="1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              color="#fff"
            >
              <path
                d="M6 17H3V4h18v13h-3"
                stroke="#fff"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
              <path
                d="M8.622 19.067L11.5 14.75a.6.6 0 01.998 0l2.88 4.318a.6.6 0 01-.5.933H9.12a.6.6 0 01-.5-.933z"
                stroke="#fff"
                stroke-width="1"
              ></path>
            </svg>
          </media-cast-button>
          <media-airplay-button class="small-button">
            <svg
              slot="airplay"
              width="24px"
              height="24px"
              stroke="#fff"
              stroke-width="1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              color="#fff"
            >
              <path
                d="M6 17H3V4h18v13h-3"
                stroke="#fff"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
              <path
                d="M8.622 19.067L11.5 14.75a.6.6 0 01.998 0l2.88 4.318a.6.6 0 01-.5.933H9.12a.6.6 0 01-.5-.933z"
                stroke="#fff"
                stroke-width="1"
              ></path>
            </svg>
          </media-airplay-button>
        </div>
        <div slot="centered-chrome">
          <media-loading-indicator></media-loading-indicator>
        </div>
        <media-control-bar>
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
          <media-captions-button class="small-button">
            <svg slot="off" viewBox="0 0 16 16">
              <path
                d="M12.6 13.7H3.4C2 13.7.8 12.6.8 11.1V4.9c0-1.4 1.1-2.6 2.6-2.6h9.3c1.4 0 2.6 1.1 2.6 2.6v6.2c-.1 1.5-1.3 2.6-2.7 2.6z"
              />
              <path
                fill="#fff"
                d="M4.7 8H3.2c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h1.5c.2 0 .4.2.4.4s-.2.4-.4.4zM12.5 8H6.7c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h5.7c.2 0 .4.2.4.4s-.1.4-.3.4zM7.7 10.2H3.2c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h4.6c.2 0 .4.2.4.4-.1.2-.3.4-.5.4zM12.5 10.2H9.8c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h2.7c.2 0 .4.2.4.4s-.2.4-.4.4z"
              />
            </svg>
            <svg slot="on" viewBox="0 0 16 16">
              <path
                d="M4.7 8H3.2c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h1.5c.2 0 .4.2.4.4s-.2.4-.4.4zM12.5 8H6.7c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h5.7c.2 0 .4.2.4.4s-.1.4-.3.4zM7.7 10.2H3.2c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h4.6c.2 0 .4.2.4.4-.1.2-.3.4-.5.4zM12.5 10.2H9.8c-.2 0-.4-.2-.4-.4s.2-.4.4-.4h2.7c.2 0 .4.2.4.4s-.2.4-.4.4z"
              />
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

  // TODO: implement observer through lit
  // connectedCallback() {
  //   this.render();

  //   const resizeObserver = new window.ResizeObserver((entries) => {
  //     entries.forEach((entry) => {
  //       entry.target.className = this.getBreakpoints(entry.contentRect).join(' ');
  //     });
  //   });

  //   if (this.shadowRoot?.querySelector('media-controller')) {
  //     resizeObserver.observe(
  //       this.shadowRoot.querySelector('media-controller') as Element,
  //     );
  //   }
  // }
}
