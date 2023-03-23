import 'media-chrome';

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import style from './main.css';

type Breakpoints = { [propKey: string]: number };

@customElement('mave-theme-main')
export default class Main extends LitElement {
  private _breakpoints: Breakpoints = { xs: 360, sm: 600, md: 760, lg: 960, xl: 1100 };

  private getBreakpoints(rect: DOMRect) {
    return Object.keys(this._breakpoints).filter((key: string) => {
      return rect.width >= this._breakpoints[key];
    });
  }

  static styles = style;

  render() {
    return html`
      <media-controller>
        <slot name="media" slot="media"></slot>
        <slot name="poster" slot="poster"></slot>
        <div class="mave-gradient-bottom"></div>
        <!-- <div slot="top-chrome">
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
        </div> -->
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
