// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

export function build(name, LitElement, html, css) {
  class Theme extends LitElement {
    static styles = css`
      :host {
        all: initial !important;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        overflow: hidden;
        background: transparent;
        direction: ltr !important;
      }

      ::slotted(video) {
        display: flex;
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: flex !important;
        background: transparent;
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
      }

      media-controller {
        display: flex;
        background: transparent;
        --media-font-family: 'Sofia', system-ui, sans-serif;
        width: var(--width, 100%);
        height: var(--height, 100%);
        aspect-ratio: var(--aspect-ratio, 16 / 9);
        margin: 0;
        padding: 0;

        --media-background-color: transparent;

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

        --media-preview-time-margin: -2px;

        --media-preview-thumbnail-max-width: 150px;
        --media-preview-thumbnail-max-height: 100px;

        --media-option-hover-background: rgba(0, 0, 0, 0.15);
      }

      media-controller[mediapaused] media-control-bar {
        opacity: 1;
      }

      media-controller[mediapaused] .mave-gradient-bottom {
        opacity: 1;
      }

      media-controller[mediapaused] div[slot='centered-chrome'] {
        opacity: 1;
      }

      media-loading-indicator {
        --media-icon-color: rgba(255, 255, 255, 1);
      }

      media-control-bar media-loading-indicator {
        position: absolute;
        left: 5px;
        top: 1px;
      }

      media-controller[media-is-fullscreen] {
        aspect-ratio: auto;
      }

      media-control-bar {
        z-index: 20;
        display: var(--media-control-bar-display, flex);
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
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
        --media-icon-color: transparent;
      }

      media-play-button.small-button svg {
        --media-icon-color: white;
      }

      media-mute-button,
      media-fullscreen-button {
        z-index: 20;
      }

      media-mute-button.small-button svg {
        height: 28px;
      }

      media-loading-indicator {
        flex: none;
        display: none;
        height: 48px;
        width: 48px;
      }

      media-loading-indicator svg {
        height: 28px;
      }

      media-controller[medialoading]:not([mediapaused]) div[slot='centered-chrome'] {
        background-color: transparent;
      }

      div[slot='centered-chrome'] media-loading-indicator {
        width: 72px;
        height: 72px;
      }

      div[slot='centered-chrome'] media-loading-indicator svg {
        width: 80px;
        height: 80px;
      }

      media-loading-indicator[medialoading]:not([mediapaused]) {
        display: flex;
      }

      media-controller[medialoading]:not([mediapaused]) media-play-button {
        opacity: 0;
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
      }

      media-preview-time-display {
        display: none;
      }

      .mave-gradient-bottom {
        display: var(--media-control-bar-display, flex);
        position: absolute;
        width: 100%;
        height: 50px;
        bottom: 0;
        pointer-events: none;
        background: var(
          --primary-color,
          linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.25) 60%,
            rgba(0, 0, 0, 0.5) 100%
          )
        );
      }

      div[slot='centered-chrome'] {
        display: var(--big-button-display, none);
        justify-content: center;
        align-items: center;
        border-radius: 1000px;
        background-color: var(--primary-color);
        padding: 12px;
      }

      div[slot='centered-chrome'] media-play-button {
        width: 72px;
        height: 72px;
        --media-icon-color: white;
      }

      div[slot='centered-chrome'] media-play-button svg {
        width: 80px;
        height: 80px;
        text: white;
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

      media-captions-selectmenu {
        z-index: 10;
        margin-right: -48px;
      }

      media-captions-selectmenu::part(listbox) {
        transform: scale(0.95);
        margin-bottom: -4px;
        margin-left: -24px;
      }

      media-captions-selectmenu::part(button) {
        opacity: 0;
      }

      media-captions-selectmenu::part(option) {
        border-radius: 8px;
      }

      media-captions-button {
        margin-right: -2px;
      }

      media-captions-button svg {
      }

      media-captions-button.small-button {
        display: none;
      }

      media-captions-button[mediacaptionlist].small-button {
        display: flex;
      }

      media-captions-button[mediasubtitleslist].small-button {
        display: flex;
      }

      media-captions-button[mediasubtitleslist].small-button svg[slot='on'] {
        --media-icon-color: white;
      }

      .mave-loader {
        position: absolute;
        display: flex;
        opacity: 0;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0 0 48px 0;
        pointer-events: none;
      }

      .mave-loader media-loading-indicator {
        width: 72px;
        height: 72px;
      }

      .mave-loader media-loading-indicator svg {
        width: 80px;
        height: 80px;
      }

      .subtitles {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        pointer-events: none;
        font-family: 'Inter', system-ui, sans-serif;
      }

      .subtitles > div {
        display: flex;
        text-align: center;
        align-items: center;
        justify-content: center;
        min-height: 22px;
        margin-bottom: 20px;
        font-weight: 500;
        font-size: 19px;
        opacity: 0;
        max-width: 80%;
        color: white;
        line-height: 1.5rem;
        transition: margin 200ms ease-out;
        text-shadow: rgba(0, 0, 0, 0.7) 0px 1px 4px;
        letter-spacing: -0.01em;
      }

      media-controller[mediapaused] ~ .subtitles > div,
      media-controller:not([userinactive]) ~ .subtitles > div {
        margin-bottom: 64px;
      }

      media-controller[mediaisfullscreen] .subtitles > div {
        min-height: 44px;
        padding: 14px 24px 12px 24px;
        font-size: 44px;
        line-height: 3.5rem;
        max-width: 40%;
        margin-bottom: 40px;
      }
    `;

    render() {
      return html`
        <media-controller>
          <slot name="media" slot="media"></slot>
          <slot name="poster" slot="poster"></slot>
          <div class="mave-gradient-bottom"></div>
          <div class="mave-loader">
            <media-loading-indicator loading-delay="0"></media-loading-indicator>
          </div>
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
            <media-loading-indicator loading-delay="0"></media-loading-indicator>
          </div>
          <media-control-bar>
            <media-loading-indicator loading-delay="0"></media-loading-indicator>
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
            <media-captions-selectmenu></media-captions-selectmenu>
            <media-captions-button disabled class="small-button">
              <svg
                slot="off"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.1"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                slot="on"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM15.375 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z"
                  clip-rule="evenodd"
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
                  stroke-width="1.1"
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
                  stroke-width="1.1"
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
                  stroke-width="1.1"
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
        <div class="subtitles">
          <div id="subtitles_text">subtitles</div>
        </div>
      `;
    }
  }
  customElements.define(`theme-${name}`, Theme);
}
