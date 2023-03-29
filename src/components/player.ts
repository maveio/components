import '../themes/main';

import { IntersectionController } from '@lit-labs/observers/intersection_controller.js';
import { Metrics } from '@maveio/metrics';
import Hls from 'hls.js';
import { css, html, LitElement, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';

@customElement('mave-player')
export class Player extends LitElement {
  @property() embed: string;
  @property({ attribute: 'aspect-ratio' }) aspect_ratio?: string;
  @property() width?: string;
  @property() height?: string;
  @property() autoplay?: 'always' | 'lazy';
  @property() controls?: 'full' | 'big' | 'none';
  @property() color?: string;
  @property() opacity?: string;
  @property() loop?: boolean;

  static styles = css`
    :host {
      display: block;
    }

    video::cue {
      font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif;
      font-weight: 500;
    }

    :host,
    media-controller {
      width: 100%;
      max-height: 100vh;
    }
  `;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.intersected.bind(this),
  });

  private embedController = new EmbedController(this);
  private _videoElement?: HTMLMediaElement;

  @state()
  private _embed: Embed;

  private _metrics: Metrics;
  private _intersected = false;

  private hls: Hls = new Hls({ startLevel: 3 });

  connectedCallback() {
    super.connectedCallback();
    this.embedController.embed = this.embed;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._metrics) {
      this._metrics.demonitor();
    }
  }

  handleVideo(videoElement?: Element) {
    if (videoElement && this._embed.video.src) {
      this._videoElement = videoElement as HTMLMediaElement;
      this._intersectionObserver.observe(this._videoElement);
      this.handleAutoplay();

      const metadata = {
        component: 'player',
        video_id: this._embed.video.id,
        space_id: this._embed.space_id,
      };

      if (this._embed.video.src.endsWith('.m3u8') && Hls.isSupported()) {
        this.hls.loadSource(this._embed.video.src);
        this.hls.attachMedia(this._videoElement);
        this._metrics = new Metrics(this.hls, this.embed, metadata).monitor();
      } else {
        this._videoElement.src = this._embed.video.src;
        this._metrics = new Metrics(this._videoElement, this.embed, metadata).monitor();
      }
    }
  }

  intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      this._intersected = isIntersecting;
      this.handleAutoplay();
    }
  }

  handleAutoplay() {
    if (
      this._embed &&
      (this.autoplay == 'lazy' || this._embed.settings.autoplay == 'on_show')
    ) {
      if (this._intersected) {
        if (this._videoElement?.paused) {
          this._videoElement.muted = true;
          this._videoElement?.play();
        }
      } else {
        if (!this._videoElement?.paused) this._videoElement?.pause();
      }
    }
  }

  handlePoster() {
    return this._embed.poster.image_src
      ? this._embed.poster.image_src
      : this._embed.poster.initial_frame_src;
  }

  updateEmbed(embed: Embed) {
    this._embed = embed;
    this.color = this._embed.settings.color;
    this.opacity = this._embed.settings.opacity
      ? (this._embed.settings.opacity as unknown as string)
      : undefined;
    this.aspect_ratio = this._embed.settings.aspect_ratio;
    this.width = this._embed.settings.width;
    this.height = this._embed.settings.height;
    this.autoplay =
      this._embed.settings.autoplay == 'on_show' ? 'lazy' : this._embed.settings.autoplay;
    this.controls = this._embed.settings.controls;
    this.loop = this._embed.settings.loop;
  }

  get styles() {
    return styleMap({
      '--primary-color': `${this.color || this._embed?.settings.color}${
        this.opacity || this._embed?.settings.opacity ? this._embed?.settings.opacity : ''
      }`,
      '--aspect-ratio':
        this.aspect_ratio == 'auto' ||
        (this._embed?.settings.aspect_ratio == 'auto' && !this.aspect_ratio)
          ? this._embed?.video.aspect_ratio
          : this.aspect_ratio || this._embed?.settings.aspect_ratio,
      '--width': this.width || this._embed?.settings.width,
      '--height': this.height || this._embed?.settings.height,
      '--media-control-bar-display':
        this.controls == 'full' ||
        (this._embed?.settings.controls == 'full' &&
          this.controls != 'big' &&
          this.controls != 'none')
          ? 'flex'
          : 'none',
      '--big-button-display':
        this.controls == 'big' ||
        (this._embed?.settings.controls == 'big' &&
          this.controls != 'full' &&
          this.controls != 'none')
          ? 'flex'
          : 'none',
    });
  }

  _renderTracks() {
    if (this._embed.subtitles.length > 0) {
      return this._embed.subtitles.map((track) => {
        return html`
          <track label=${track.label} kind="subtitles" srclang=${track.language} src=${track.path}></track>
        `;
      });
    }
  }

  render() {
    return html`
      <slot name="video">
        ${this.embedController.render({
          pending: () =>
            html`
              <mave-theme-main style=${this.styles}
                ><video slot="media"></video
              ></mave-theme-main>
            `,
          error: (error: unknown) =>
            html`<p>${error instanceof Error ? error.message : nothing}</p>`,
          complete: (data) => {
            if (!this._embed) this._embed = data as Embed;

            return html`
              <mave-theme-main style=${this.styles}>
                <video
                  ?autoplay=${this.autoplay == 'always' ||
                  (this._embed.settings.autoplay == 'always' && this.autoplay != 'lazy')
                    ? true
                    : false}
                  ?loop=${this.loop || this._embed.settings.loop}
                  ?muted=${this.autoplay == 'always' ||
                  this._embed.settings.autoplay == 'always' ||
                  this.autoplay == 'lazy'}
                  poster=${this.handlePoster()}
                  ${ref(this.handleVideo)}
                  slot="media"
                  crossorigin="anonymous"
                >
                  ${this._renderTracks()}
                </video>
              </mave-theme-main>
            `;
          },
        })}
      </slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-player': Player;
  }
}
