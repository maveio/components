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
        container-type: inline-size;
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
        container-type: inline-size;
        width: 100%;
        height: 100%;
        max-height: 100vh;
        background: transparent;
        aspect-ratio: var(--aspect-ratio, 16 / 9);

        user-select: none;

        --media-font-family: 'Inter', system-ui, sans-serif;
        --media-background-color: transparent;

        --media-primary-color: var(--mave-control-fg, rgba(255, 255, 255, 0.94));
        --media-secondary-color: var(--mave-control-fg, rgba(255, 255, 255, 0.94));

        --media-control-padding: 8px;
        --media-control-background: transparent;
        --media-option-hover-background: rgba(0, 0, 0, 0.25);

        --media-range-track-background: var(--mave-control-fg-weak, rgba(255, 255, 255, 0.35));
        --media-range-track-pointer-background: var(
          --mave-control-fg-muted,
          rgba(255, 255, 255, 0.6)
        );

        --media-preview-time-margin: 0 0 8px 0;

        --media-preview-thumbnail-max-width: 132px;
        --media-preview-thumbnail-max-height: 88px;
      }

      media-controller svg[stroke],
      media-controller svg [stroke] {
        stroke: currentColor;
      }

      media-controller svg[fill]:not([fill='none']),
      media-controller svg [fill]:not([fill='none']) {
        fill: currentColor;
      }

      media-loading-indicator {
        position: absolute;
        left: 6px;
        pointer-events: none;
        padding-top: 3px;
      }

      media-controller[medialoading]:not([mediapaused]) media-play-button {
        opacity: 0;
      }

      media-control-bar {
        width: 100%;
        height: 48px;
        padding: 0 8px;
        z-index: 10;
        user-select: none;
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);

        background: var(--mave-control-bg, var(--primary-color, transparent));

        --media-control-hover-background: transparent;
      }

      media-time-range {
        width: 100%;
        margin: 0 0 -4px 0;
        padding: 0;
        height: 4px;
        border-radius: 0;
        z-index: 20;

        --media-control-hover-background: transparent;

        --media-range-track-height: 4px;
        --media-range-track-border-radius: 0;
        --media-range-hover-background: transparent;

        --media-range-thumb-width: 4px;
        --media-range-thumb-height: 4px;
        --media-range-thumb-transition: transform 100ms ease-out;
        --media-text-color: #fff;
      }

      @media (prefers-contrast: more) {
        media-time-range {
          --media-preview-time-background: rgba(0, 0, 0, 0.85);
          --media-preview-time-text-shadow: none;
        }
      }

      media-time-display {
        font-size: 0.85rem;
        margin: 0 7px 0 7px;
      }

      media-mute-button {
        display: var(--media-mute-button-display, var(--volume-display, inline-flex));
      }

      media-play-button,
      media-fullscreen-button,
      media-mute-button,
      mave-captions-menu-button,
      media-settings-menu-button,
      media-audio-track-menu-button,
      mave-audio-track-menu-button {
        transform: translate3d(0, 0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 100ms;
      }

      media-play-button:hover,
      media-fullscreen-button:hover,
      media-mute-button:hover,
      mave-captions-menu-button:hover,
      media-settings-menu-button:hover,
      media-audio-track-menu-button:hover,
      mave-audio-track-menu-button:hover {
        --media-primary-color: var(--mave-control-fg, rgba(255, 255, 255, 1));
        transform: scale(1.3);
      }

      mave-captions-menu-button:hover,
      media-settings-menu-button:hover,
      media-audio-track-menu-button:hover,
      mave-audio-track-menu-button:hover {
        transform: scale(1);
      }

      mave-captions-menu-button[aria-expanded='true'],
      media-settings-menu-button[aria-expanded='true'],
      media-audio-track-menu-button[aria-expanded='true'],
      mave-audio-track-menu-button[aria-expanded='true'] {
        transform: scale(1);
      }

      media-play-button div,
      media-fullscreen-button div,
      media-mute-button div {
        width: 26px;
        padding-top: 7px;
      }

      mave-captions-menu-button div,
      media-settings-menu-button div,
      media-audio-track-menu-button div,
      mave-audio-track-menu-button div {
        width: 26px;
        padding-top: 6px;
      }

      media-play-button svg,
      mave-captions-menu-button svg,
      media-settings-menu-button svg,
      media-fullscreen-button svg,
      media-mute-button svg,
      media-audio-track-menu-button svg,
      mave-audio-track-menu-button svg {
        width: 23px;
        height: 23px;
        transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      mave-captions-menu-button:hover svg,
      media-settings-menu-button:hover svg,
      media-audio-track-menu-button:hover svg,
      mave-audio-track-menu-button:hover svg {
        transform: scale(1.3);
      }

      mave-captions-menu-button[aria-expanded='true'] svg,
      media-settings-menu-button[aria-expanded='true'] svg,
      media-audio-track-menu-button[aria-expanded='true'] svg,
      mave-audio-track-menu-button[aria-expanded='true'] svg {
        transform: scale(1);
      }

      media-captions-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        min-width: 120px;
        transform-origin: bottom right;
        background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.5)));
        border-radius: 8px;
        backdrop-filter: blur(12px);
      }

      /* media-captions-menu::part(menu-item) {
        border-radius: 8px;
      } */

      media-captions-menu::part(menu-item):hover {
        background: rgba(0, 0, 0, 0.15);
      }

      media-settings-menu {
        background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.5)));
        border-radius: 8px;
        backdrop-filter: blur(12px);
        min-width: 160px;
      }

      media-settings-menu[hidden] {
        display: none;
      }

      media-settings-menu-item {
        --media-menu-item-hover-background: rgba(0, 0, 0, 0.15);
      }

      media-audio-track-menu,
      mave-audio-track-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        min-width: 120px;
        transform-origin: bottom right;
        background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.5)));
        border-radius: 8px;
        backdrop-filter: blur(12px);
      }

      media-audio-track-menu::part(menu-item):hover,
      mave-audio-track-menu::part(menu-item):hover {
        background: rgba(0, 0, 0, 0.15);
      }

      media-audio-track-menu[hidden],
      mave-audio-track-menu[hidden] {
        display: none;
      }

      media-audio-track-menu-button,
      mave-audio-track-menu-button {
        display: var(--media-audio-track-menu-button-display, none);
      }

      media-settings-menu-button {
        display: none;
      }

      @supports not (container-type: inline-size) {
        media-settings-menu-button {
          display: flex;
        }
      }

      media-controller[mediapaused] div[slot='centered-chrome'] media-play-button {
        opacity: 1;
      }

      div[slot='centered-chrome'] media-play-button {
        opacity: 0;
        --media-control-background: var(
          --mave-control-bg,
          var(--primary-color, rgba(0, 0, 0, 0.45))
        );
        --media-control-hover-background: var(
          --mave-control-bg,
          var(--primary-color, rgba(0, 0, 0, 0.45))
        );
        border-radius: 999px;
        padding: 8px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(6px);
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
        transition: margin 300ms ease-out, transform 200ms ease-in-out,
          opacity 200ms ease-in-out;
        letter-spacing: -0.01em;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        border-radius: 6px;
        padding: 4px 10px 6px 10px;
        margin-left: 20px;
        margin-right: 20px;
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
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(16px);
        border-radius: 8px;
      }

      media-playback-rate-button {
        font-size: 0.85rem;
        margin: 0 7px 0 7px;
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
        display: var(--media-mute-button-display, var(--volume-display, flex));
      }

      media-fullscreen-button {
        display: var(--fullscreen-display, flex);
      }

      media-playback-rate-button {
        display: var(--playbackrate-display, flex);
      }

      media-captions-menu,
      mave-captions-menu-button[mediasubtitleslist] {
        display: var(--captions-display, flex);
      }

      @container (max-width: 480px) {
        media-control-bar {
          position: static;
          padding: 0 2px;
          transform: none;
          z-index: auto;
        }

        media-captions-menu,
        media-audio-track-menu,
        mave-audio-track-menu,
        media-settings-menu {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          min-width: unset;
          width: 100%;
          max-height: none;
          overflow-y: auto;
          border-radius: 0;
          background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.85)));
          --media-menu-background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.85)));
          --media-settings-menu-background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.85)));
          backdrop-filter: blur(16px);
          transform-origin: bottom center;
          z-index: 30;
        }

        .mave-gradient-bottom {
          display: none;
        }

        media-control-bar > div[style*='flex-grow: 1'] {
          display: none;
        }

        media-time-display {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 14px;
          min-width: 0;
          margin: 0;
          padding: 2px 6px;
          background: var(--mave-control-bg, var(--primary-color, rgba(0, 0, 0, 0.5)));
          backdrop-filter: blur(8px);
          border-radius: 4px;
          z-index: 10;
        }

        media-time-range {
          margin: 0;
          padding: 4px 8px 0;
          z-index: auto;
          background: var(--mave-control-bg, var(--primary-color, transparent));
          --media-preview-thumbnail-max-width: 0px;
          --media-preview-thumbnail-max-height: 0px;
        }

        media-preview-thumbnail {
          display: none;
        }

        div[slot='centered-chrome'] {
          display: none;
        }
      }

      .mave-loader {
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0 0 0 0;
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
    `;

    render() {
      return html`
        <media-controller novolumepref>
          <div class="subtitles">
            <div id="subtitles_text">subtitles</div>
          </div>
          <slot name="media" slot="media"></slot>
          <media-time-range></media-time-range>
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
            class="mave-gradient-bottom"
            style="position: absolute; bottom: 0; width: 100%; height: 25%; background: linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%); pointer-events: none;"
          ></div>
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
            <div class="mave-loader">
              <media-loading-indicator loading-delay="0"></media-loading-indicator>
            </div>
            <div style="flex-grow: 1;"></div>
            <media-time-display showduration></media-time-display>
            <media-playback-rate-button></media-playback-rate-button>
            <mave-captions-menu-button id="mave-captions">
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
            </mave-captions-menu-button>
            <media-captions-menu hidden anchor="mave-captions"></media-captions-menu>
            <mave-audio-track-menu
              hidden
              anchor="mave-audio-tracks"
            ></mave-audio-track-menu>
            <mave-audio-track-menu-button id="mave-audio-tracks">
              <div slot="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 22 22"
                  fill="none"
                  stroke="#fff"
                  stroke-width="1.1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="9"></circle>
                  <path d="M8 15v-5"></path>
                  <path d="M11 17V8"></path>
                  <path d="M14 15v-3"></path>
                </svg>
              </div>
            </mave-audio-track-menu-button>
            <media-settings-menu-button id="mave-settings">
              <div slot="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="12" r="2"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="19" cy="12" r="2"></circle>
                </svg>
              </div>
            </media-settings-menu-button>
            <media-settings-menu hidden anchor="mave-settings">
              <media-settings-menu-item style="display: var(--playbackrate-display, flex);">
                <span>Playback speed</span>
                <media-playback-rate-menu slot="submenu" hidden></media-playback-rate-menu>
              </media-settings-menu-item>
              <media-settings-menu-item
                style="display: var(--mave-captions-menu-button-display, flex);"
              >
                <span>Captions</span>
                <media-captions-menu slot="submenu" hidden></media-captions-menu>
              </media-settings-menu-item>
              <media-settings-menu-item
                style="display: var(--media-audio-track-menu-button-display, none);"
              >
                <span>Audio tracks</span>
                <mave-audio-track-menu slot="submenu" hidden></mave-audio-track-menu>
              </media-settings-menu-item>
            </media-settings-menu>
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
        </media-controller>
      `;
    }
  }
  customElements.define(`theme-${name}`, Theme);
}
