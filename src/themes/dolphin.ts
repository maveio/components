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
        position: relative;
        direction: ltr !important;
      }

      img,
      video {
        overflow: hidden;
      }

      ::slotted(video) {
        overflow: hidden;
        display: flex;
        width: 100%;
        height: 100%;
        aspect-ratio: var(--aspect-ratio, 16 / 9);
        object-fit: contain;
        display: flex !important;
        background: transparent;
        transform-origin: center;
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
      }

      media-controller {
        --media-tooltip-display: none;
        display: flex;
        width: 100%;
        height: 100%;
        aspect-ratio: var(--aspect-ratio, 16 / 9);
        background: transparent;
        --media-font-family: 'Inter', system-ui, sans-serif;
        --media-background-color: transparent;

        --media-primary-color: rgba(255, 255, 255, 0.94);
        --media-secondary-color: rgba(255, 255, 255, 0.94);

        --media-control-padding: 8px;
        --media-control-background: transparent;
        --media-option-hover-background: rgba(0, 0, 0, 0.25);

        --media-preview-time-margin: 0;

        --media-preview-thumbnail-max-width: 132px;
        --media-preview-thumbnail-max-height: 88px;
      }

      media-control-bar {
        border-radius: 12px;
        width: 100%;
        height: 38px;
        padding: 0 0 0 3px;
        z-index: 20;

        background: var(--primary-color, rgba(0, 0, 0, 0.25));

        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);

        --media-range-track-height: 5px;
        --media-control-hover-background: transparent;

        --media-range-thumb-width: 5px;
        --media-range-thumb-height: 5px;
        --media-range-thumb-transition: transform 100ms ease-out;
      }

      media-time-range {
        width: 100%;
        height: 38px;
        flex-grow: 1;
        border-radius: 8px;

        --media-range-track-border-radius: 8px;
        --media-range-hover-background: transparent;
      }

      media-time-display {
        font-size: 0.85rem;
        margin: 0 0 0 7px;
      }

      media-mute-button {
        display: var(--media-volume-display, inline-flex);
      }

      media-play-button,
      media-fullscreen-button,
      media-mute-button,
      media-captions-menu-button {
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 100ms;
      }

      media-play-button:hover,
      media-fullscreen-button:hover,
      media-mute-button:hover,
      media-captions-menu-button:hover {
        --media-primary-color: rgba(255, 255, 255, 1);
        transform: scale(1.3);
      }

      media-play-button div,
      media-fullscreen-button div,
      media-mute-button div {
        width: 26px;
        padding-top: 7px;
      }

      media-captions-menu-button div {
        width: 26px;
        padding-top: 6px;
      }

      media-play-button svg,
      media-captions-menu-button svg,
      media-fullscreen-button svg,
      media-mute-button svg {
        width: 23px;
        height: 23px;
      }

      media-loading-indicator {
        position: absolute;
        pointer-events: none;
        transform: scale(0.9);
        top: -3px;
        left: 0px;
      }

      media-controller[medialoading]:not([mediapaused]) media-play-button {
        opacity: 0;
      }

      media-captions-menu {
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        position: absolute;
        bottom: calc(100% + 8px);
        min-width: 120px;
        transform: scale(0.95);
        transform-origin: bottom right;
      }

      media-controller[mediapaused] div[slot='centered-chrome'] media-play-button {
        opacity: 1;
      }

      div[slot='centered-chrome'] media-play-button {
        opacity: 0;
        --media-control-hover-background: transparent;
      }

      div[slot='centered-chrome'] media-play-button div {
        padding: 0;
        width: 80px;
        height: 80px;
      }

      div[slot='centered-chrome'] media-play-button svg {
        width: 80px;
        height: 80px;
      }

      .subtitles {
        opacity: 1;
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
        margin-bottom: 24px;
        font-weight: 500;
        font-size: 19px;
        opacity: 0;
        max-width: 80%;
        color: white;
        line-height: 1.5rem;
        transition: margin 300ms ease-out;
        text-shadow: rgba(0, 0, 0, 0.7) 0px 1px 4px;
        letter-spacing: -0.01em;
      }

      media-controller[mediapaused] .subtitles > div,
      media-controller:not([userinactive]) .subtitles > div {
        margin-bottom: 76px;
      }

      media-controller[mediaisfullscreen] .subtitles > div {
        min-height: 44px;
        padding: 14px 24px 12px 24px;
        font-size: 26px;
        line-height: 2rem;
        max-width: 40%;
        margin-bottom: 54px;
      }

      media-playback-rate-button {
        font-size: 0.85rem;
        font-weight: 400 !important;
      }

      media-play-button {
        display: var(--play-display, flex);
      }

      media-time-display {
        display: var(--time-display, flex);
      }

      media-time-range {
        visibility: var(--seek-bar-visibility, visible);
      }

      media-mute-button {
        display: var(--volume-display, flex);
      }

      media-fullscreen-button {
        display: var(--fullscreen-display, flex);
      }

      media-playback-rate-button {
        display: var(--playbackrate-display, flex);
      }

      media-captions-menu,
      media-captions-menu-button[mediasubtitleslist] {
        display: var(--captions-display, flex);
      }
    `;

    render() {
      return html`
        <media-controller novolumepref>
          <div class="subtitles">
            <div id="subtitles_text">subtitles</div>
          </div>
          <slot name="media" slot="media"></slot>
          <div slot="centered-chrome">
            <media-play-button>
              <div slot="play">
                <svg
                  width="24px"
                  height="24px"
                  stroke-width="0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  color="currentColor"
                >
                  <path
                    d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z"
                    stroke="currentColor"
                    stroke-width="0"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>
                </svg>
              </div>
              <div slot="pause"></div>
            </media-play-button>
          </div>
          <div
            style="position: absolute; bottom: 0; width: 100%; height: 50%; background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"
          ></div>
          <div style="width: calc(100% - 32px); padding: 16px;">
            <media-control-bar>
              <media-play-button>
                <div slot="play">
                  <svg
                    width="24px"
                    height="24px"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    color="currentColor"
                  >
                    <path
                      d="M6.906 4.537A.6.6 0 006 5.053v13.894a.6.6 0 00.906.516l11.723-6.947a.6.6 0 000-1.032L6.906 4.537z"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>
                  </svg>
                </div>
                <div slot="pause">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </media-play-button>
              <media-loading-indicator loading-delay="0"></media-loading-indicator>
              <media-time-range></media-time-range>
              <media-time-display showduration></media-time-display>
              <div style="flex-grow: 1;"></div>
              <media-playback-rate-button></media-playback-rate-button>
              <media-captions-menu-button>
                <div slot="off">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width=""
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                    />
                  </svg>
                </div>
                <div slot="on">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </media-captions-menu-button>
              <media-captions-menu hidden anchor="auto"></media-captions-menu>
              <media-mute-button>
                <div slot="high">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </div>
                <div slot="medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </div>
                <div slot="low">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </div>
                <div slot="off">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </div>
              </media-mute-button>
              <media-fullscreen-button>
                <div slot="enter">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5"
                    />
                  </svg>
                </div>
                <div slot="exit">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.3"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5"
                    />
                  </svg>
                </div>
              </media-fullscreen-button>
            </media-control-bar>
          </div>
        </media-controller>
      `;
    }
  }
  customElements.define(`theme-${name}`, Theme);
}
