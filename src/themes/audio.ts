import type { css as CSS, html as HTML, LitElement as Element } from 'lit';

/** Adds an audio layout to the existing themes, keeping their controls and styling. */
export function createAudioTheme(
  LitElement: typeof Element,
  html: typeof HTML,
  css: typeof CSS,
  theme: 'default' | 'dolphin' | 'synthwave',
): typeof Element {
  return class AudioTheme extends LitElement {
    static properties = {
      audio: { type: Boolean, reflect: true },
      type: { reflect: true },
      thumbnail: { type: Boolean },
      audioTitle: { attribute: 'audio-title' },
      audioSubtitle: { attribute: 'audio-subtitle' },
      audioArtwork: { attribute: 'audio-artwork' },
      waveform: { attribute: false },
    };

    declare audio: boolean;
    declare type: 'line' | 'wave';
    declare thumbnail: boolean;
    declare audioTitle?: string;
    declare audioSubtitle?: string;
    declare audioArtwork?: string;
    declare waveform?: number[];

    // Every override is scoped to audio; video continues to use the original CSS.
    static styles = css`
      :host([audio]) {
        display: block !important;
        height: auto !important;
        overflow: visible !important;
      }
      :host([audio]) ::slotted([slot='media']) {
        display: none;
      }
      :host([audio]) media-controller {
        display: block;
        box-sizing: border-box;
        padding: 16px 16px 12px;
        height: auto;
        max-height: none;
        aspect-ratio: auto;
        overflow: visible;
        line-height: 1.5;
        background: var(--mave-audio-background, var(--mave-control-bg, #171717));
        border-radius: var(--mave-audio-radius, 12px);
        --media-background-color: transparent;
        --media-tooltip-display: none;
      }
      :host([audio]) .audio-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--mave-control-fg, #fff);
        font: 14px/1.5 var(--media-font-family, system-ui, sans-serif);
      }
      :host([audio]) .audio-artwork {
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        border-radius: 6px;
        object-fit: cover;
      }
      :host([audio]) .audio-details {
        min-width: 0;
      }
      :host([audio]) h2 {
        font: inherit;
        font-weight: 600;
        margin: 0;
        overflow-wrap: anywhere;
      }
      :host([audio]) .audio-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--mave-control-fg-muted, #bbb);
        overflow-wrap: anywhere;
      }
      :host([audio]) .audio-controls {
        display: var(--media-control-bar-display, flex);
        flex-direction: column;
        gap: 4px;
        margin: 8px -8px -4px;
      }
      :host([audio]) media-control-bar {
        display: var(--media-control-bar-display, flex);
        position: relative;
        align-items: center;
        height: auto;
        min-height: 40px;
        width: auto;
        margin: 0;
        padding: 0;
        gap: 0;
      }
      /* Audio menus float outside the compact player, including on narrow layouts. */
      :host([audio])
        media-control-bar
        > :is(
          media-captions-menu,
          media-audio-track-menu,
          mave-audio-track-menu,
          media-settings-menu
        ) {
        position: absolute;
        top: auto;
        bottom: calc(100% + 4px);
        left: auto;
        right: 0;
        width: max-content;
        min-width: 120px;
        max-width: 100%;
        max-height: min(300px, 50vh);
        border-radius: 8px;
        z-index: 30;
        --media-menu-max-height: min(300px, 50vh);
      }
      :host([audio])
        :is(
          media-captions-menu,
          media-audio-track-menu,
          mave-audio-track-menu,
          media-settings-menu,
          media-volume-range
        ) {
        background: var(--mave-audio-background, var(--mave-control-bg, #171717));
        --media-menu-background: var(
          --mave-audio-background,
          var(--mave-control-bg, #171717)
        );
        --media-settings-menu-background: var(--media-menu-background);
        box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
        backdrop-filter: none;
      }
      :host([audio])
        :is(
          media-play-button,
          media-mute-button,
          media-playback-rate-button,
          mave-captions-menu-button,
          mave-audio-track-menu-button,
          media-airplay-button
        ) {
        box-sizing: border-box;
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        margin: 0;
        padding: 0;
      }
      :host([audio]) media-control-bar > .mave-loader {
        position: absolute;
        top: 0;
        left: 0;
        width: 40px;
        height: 40px;
      }
      :host([audio]) .mave-loader media-loading-indicator {
        width: 40px;
        height: 40px;
      }
      :host([audio])
        media-control-bar
        > :is(
          media-play-button,
          media-mute-button,
          mave-captions-menu-button,
          mave-audio-track-menu-button,
          media-airplay-button
        )
        > div[slot] {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0;
      }
      :host([audio]) .dolphin media-control-bar > div[style*='flex-grow: 1'] {
        display: none;
      }
      :host([audio]) media-control-bar > media-time-range,
      :host([audio]) .audio-timeline {
        flex: 1;
        min-width: 40px;
        visibility: var(--seek-bar-visibility, visible);
      }
      :host([audio]) media-time-display {
        position: static;
        flex: 0 0 auto;
        min-width: 0;
        margin: 0;
        padding: 0 4px !important;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      :host([audio]) media-control-bar > media-time-range {
        height: 40px;
        margin: 0 calc(var(--media-range-thumb-width, 8px) / 2 + 4px);
        --media-range-padding: 4px;
      }
      :host([audio]) .audio-controls > media-time-range {
        width: auto;
        height: 24px;
        margin: 0 8px;
        padding: 0;
        --media-range-padding: 0;
      }
      :host([audio]) .audio-controls > .audio-timeline {
        flex: 0 0 auto;
      }
      :host([audio]) media-time-range {
        z-index: auto;
        --media-range-thumb-width: 6px;
        --media-range-thumb-height: 6px;
        --media-range-thumb-background: var(--mave-control-fg, #fff);
        --media-range-thumb-transform: scale(1);
        --media-range-thumb-transition: none;
        --media-range-thumb-opacity: 0;
      }
      :host([audio]) media-time-range:is(:hover, :focus-within, [dragging]) {
        --media-range-thumb-opacity: 1;
      }
      /* Align the preview within the seek area, below the audio metadata. */
      :host([audio]) media-time-range::part(preview-box) {
        top: -8px;
        bottom: auto;
        margin: 0;
      }
      :host([audio]) media-preview-time-display {
        display: inline-flex;
        color: var(--mave-control-bg, #171717);
        background: var(--mave-control-fg, #fff);
        font: 500 12px/16px var(--media-font-family, system-ui, sans-serif);
        font-variant-numeric: tabular-nums;
        letter-spacing: normal;
        text-shadow: none;
        border-radius: 4px;
        padding: 0 5px;
        margin: 0;
        opacity: 1;
      }
      :host([audio]) .audio-controls > media-time-range,
      :host([audio]) media-control-bar > media-time-range,
      :host([audio]) .audio-timeline {
        display: var(--audio-timeline-display, block);
      }
      :host([audio]) .audio-timeline {
        position: relative;
        height: 40px;
        margin: 0 8px;
        border-radius: 4px;
      }
      :host([audio]) .audio-timeline svg {
        display: block;
        width: 100%;
        height: 100%;
        color: var(--mave-control-fg-weak, #ffffff40);
      }
      :host([audio]) .audio-timeline path {
        fill: none;
        stroke: currentColor;
      }
      :host([audio]) .audio-timeline .played {
        position: absolute;
        inset: 0;
        color: var(--mave-control-fg, #fff);
        clip-path: inset(0 calc(100% - var(--progress, 0%)) 0 0);
      }
      :host([audio]) .audio-timeline media-time-range {
        position: absolute;
        inset: 0;
        background: transparent;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        --media-range-padding: 0;
        opacity: 1;
      }
      /* Keep the preview and input visible while the waveform replaces the rail. */
      :host([audio]) .audio-timeline media-time-range::part(track),
      :host([audio]) .audio-timeline media-time-range::part(thumb) {
        opacity: 0;
      }
      :host([audio]) media-play-button {
        display: var(--play-display, flex);
      }
      :host([audio][big-control]) media-play-button {
        width: 64px;
        height: 64px;
      }
      :host([audio]) #subtitles_text:empty {
        display: none;
      }
      :host([audio]) #subtitles_text {
        margin-top: 8px;
        color: var(--mave-control-fg, #fff);
        font: 14px/1.5 var(--media-font-family, system-ui, sans-serif);
      }
      @container (max-width: 480px) {
        :host([audio]) media-control-bar {
          flex-wrap: wrap;
        }
        :host([audio]) media-control-bar > :not(media-time-range) {
          flex: 0 0 auto;
          order: 2;
        }
        :host([audio]) media-control-bar > .audio-timeline,
        :host([audio]) media-control-bar > media-time-range {
          flex: 1 0 calc(100% - 16px);
          width: auto;
          margin: 0 8px;
          order: 1;
        }
        :host([audio]) media-control-bar > media-time-range {
          height: 28px;
          --media-range-padding: calc(var(--media-range-thumb-width, 8px) / 2);
        }
      }
      @media (forced-colors: active) {
        :host([audio]) .audio-timeline svg {
          visibility: hidden;
        }
        :host([audio]) .audio-timeline media-time-range::part(track),
        :host([audio]) .audio-timeline media-time-range::part(thumb) {
          opacity: 1;
        }
      }
    `;

    private media?: HTMLMediaElement;
    private syncProgress = () => {
      const media = this.media;
      const progress =
        media && media.duration > 0
          ? Math.max(0, Math.min(100, (media.currentTime / media.duration) * 100))
          : 0;
      this.style.setProperty('--progress', `${progress}%`);
    };
    private bindMedia = () => {
      this.unbindMedia();
      this.media = this.querySelector('audio') ?? undefined;
      for (const event of ['timeupdate', 'loadedmetadata', 'emptied'])
        this.media?.addEventListener(event, this.syncProgress);
      this.syncProgress();
    };
    private unbindMedia() {
      for (const event of ['timeupdate', 'loadedmetadata', 'emptied'])
        this.media?.removeEventListener(event, this.syncProgress);
    }
    connectedCallback() {
      super.connectedCallback();
      if (this.audio) this.bindMedia();
    }
    disconnectedCallback() {
      super.disconnectedCallback();
      this.unbindMedia();
    }

    renderAudioTimeline() {
      const range = html`<media-time-range>
        <media-preview-time-display slot="preview"></media-preview-time-display>
      </media-time-range>`;
      const peaks =
        this.type === 'wave' && this.waveform?.length ? this.waveform : undefined;
      if (!peaks) return range;
      const maximum = Math.max(...peaks, 0.001);
      const path = peaks
        .map((peak, i) => {
          const height = Math.max(0.5, (peak / maximum) * 24);
          return `M${i * 4 + 2} ${26 - height}V${26 + height}`;
        })
        .join(' ');
      return html`<div class="audio-timeline waveform">
        <svg
          viewBox=${`0 0 ${peaks.length * 4} 52`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d=${path}
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          ></path>
        </svg>
        <svg
          class="played"
          viewBox=${`0 0 ${peaks.length * 4} 52`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d=${path}
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          ></path>
        </svg>
        ${range}
      </div>`;
    }

    renderControls() {
      return html``;
    }

    renderAudio() {
      return html`<media-controller audio noautohide novolumepref>
        <slot name="media" slot="media" @slotchange=${this.bindMedia}></slot>
        <div class="audio-heading">
          ${this.thumbnail && this.audioArtwork
            ? html`<img class="audio-artwork" src=${this.audioArtwork} alt="" />`
            : ''}
          <div class="audio-details">
            <h2>${this.audioTitle || 'Audio'}</h2>
            ${this.audioSubtitle
              ? html`<p class="audio-subtitle">${this.audioSubtitle}</p>`
              : ''}
          </div>
        </div>
        <div class=${`audio-controls ${theme}`}>
          ${theme === 'synthwave' ? this.renderAudioTimeline() : ''}
          ${this.renderControls()}
        </div>
        <div id="subtitles_text"></div>
      </media-controller>`;
    }
  };
}
