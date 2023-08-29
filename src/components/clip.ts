import { IntersectionController } from '@lit-labs/observers/intersection_controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { videoEvents } from '../utils/video_events';

export class Clip extends LitElement {
  @property() embed: string;
  @property() autoplay?: 'always' | 'off' | 'lazy';
  @property() loop?: boolean;
  @property() quality = 'fhd';
  @property() token?: string;

  private _poster?: string;
  @property()
  get poster(): string {
    return this.embedController.embedFile('poster.webp');
  }
  set poster(value: string | null) {
    if (value) {
      const oldValue = this._poster;
      this._poster = value;
      this.requestUpdate('poster', oldValue);
    }
  }

  private _source?: string;
  @property()
  get source(): string {
    if (this._source) {
      return this._source;
    }

    return this.embedController.embedFile(
      `${this.highestMP4Rendition.codec}_${this.highestMP4Rendition.size}.${this.highestMP4Rendition.container}`,
    );
  }
  set source(value: string | null) {
    if (value) {
      const oldValue = this._source;
      this._source = value;
      this.requestUpdate('source', oldValue);
    }
  }

  get deterministic_source(): string {
    return this.embedController.embedFile('h264_fhd.mp4');
  }

  private _videoElement?: HTMLMediaElement;
  private _queue: { (): void }[] = [];

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.intersected.bind(this),
  });

  static styles = css`
    :host,
    video {
      all: initial;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;

  private embedController = new EmbedController(this);
  private _metrics: Metrics;
  private _embed: Embed;

  connectedCallback() {
    super.connectedCallback();
    if (this.token) this.embedController.token = this.token;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown) {
    super.requestUpdate(name, oldValue);
    if (name === 'embed') {
      this.embedController.embed = this.embed;
    }
    if (name === 'token' && this.token) {
      this.embedController.token = this.token;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._metrics) {
      this._metrics.demonitor();
    }
  }

  set muted(value: boolean) {
    if (this._videoElement) {
      this._videoElement.muted = value;
    }
  }

  get muted(): boolean {
    return this._videoElement?.muted || false;
  }

  play() {
    if (this._videoElement) {
      this._videoElement.play();
    } else {
      this._queue.push(() => this._videoElement?.play());
    }
  }

  pause() {
    if (this._videoElement) {
      this._videoElement.pause();
    } else {
      this._queue.push(() => this._videoElement?.pause());
    }
  }

  handleVideo(videoElement?: Element) {
    if (!this._videoElement) {
      this._videoElement = videoElement as HTMLMediaElement;
    }

    if (this._videoElement && this._embed && !this._metrics) {
      this._intersectionObserver.observe(this._videoElement);

      videoEvents.forEach((event) => {
        this._videoElement?.addEventListener(event, (e) => {
          this.dispatchEvent(
            new CustomEvent(event, {
              detail: e,
              bubbles: true,
              composed: true,
            }),
          );
        });
      });

      const metadata = {
        component: 'clip',
        video_id: this._embed.video.id,
        space_id: this._embed.space_id,
      };

      Metrics.config = {
        socketPath: '__MAVE_METRICS_SOCKET_ENDPOINT__',
        apiKey: this._embed.metrics_key,
      };

      this._metrics = new Metrics(this._videoElement, this.embed, metadata).monitor();
    }

    if (this._queue.length) {
      this._queue.forEach((fn) => fn());
      this._queue = [];
    }
  }

  intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (!isIntersecting || this.autoplay === 'always') return;

      if (this.autoplay === 'lazy' || this.autoplay === undefined) {
        if (this._videoElement?.paused) this._videoElement?.play();
      } else {
        if (!this._videoElement?.paused) this._videoElement?.pause();
      }
    }
  }

  requestPlay() {
    if (this.autoplay === 'off') {
      if (this._videoElement?.paused) {
        this._videoElement?.play();
      } else {
        this._videoElement?.pause();
      }
    }
  }

  get highestMP4Rendition() {
    const renditions = this._embed.video.renditions.filter(
      (rendition) => rendition.container == 'mp4',
    );

    const sizes = ['sd', 'hd', 'fhd', 'qhd', 'uhd'];

    const highestRendition = renditions
      .filter((rendition) => {
        const qualityIndex = sizes.indexOf(this.quality);
        const renditionIndex = sizes.indexOf(rendition.size);
        return renditionIndex <= qualityIndex;
      })
      .reduce((highest, rendition) => {
        const size = sizes.indexOf(rendition.size);
        if (size > sizes.indexOf(highest.size)) {
          return rendition;
        } else {
          return highest;
        }
      });

    return highestRendition;
  }

  render() {
    if (this.quality !== 'fhd') {
      return html`
        ${this.embedController.render({
          // TODO: add loading state with loading player UI
          pending: this.renderPending,
          error: (error: unknown) =>
            // TODO: add error state with error player UI
            html`<p>${error instanceof Error ? error.message : nothing}</p>`,
          complete: (data) => {
            this._embed = data as Embed;
            if (!data) return this.renderPending();

            return html`
              <video
                @click=${this.requestPlay}
                preload="metadata"
                muted
                playsinline
                ?autoplay=${this.autoplay === 'always'}
                ?loop=${this.loop || true}
                ${ref(this.handleVideo)}
                poster=${this.poster}
              >
                <source
                  src=${this.source}
                  type="video/${this.highestMP4Rendition.container}"
                />
              </video>
            `;
          },
        })}
      `;
    } else {
      return html`
        ${this.embedController.render({
          complete: (data) => {
            this._embed = data as Embed;
            this.handleVideo();
          },
        })}
        <video
          @click=${this.requestPlay}
          preload="metadata"
          muted
          playsinline
          ${ref(this.handleVideo)}
          ?autoplay=${this.autoplay === 'always'}
          ?loop=${this.loop || true}
          poster=${this.poster}
        >
          <source src=${this.deterministic_source} type="video/mp4" />
        </video>
      `;
    }
  }

  renderPending() {
    return html`<video muted poster=${this.poster} src="" preload="none" loop></video>`;
  }
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-clip')) {
    window.customElements.define('mave-clip', Clip);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-clip': Clip;
  }
}
