import { IntersectionController } from '@lit-labs/observers/intersection_controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';

export class Clip extends LitElement {
  @property() embed: string;
  @property() autoplay?: 'always' | 'off' | 'lazy';
  @property() loop?: boolean;

  private _poster?: string;
  @property()
  get poster(): string {
    if (this._poster && this._poster == 'custom') {
      return `${this.embedController.cdnRoot}/thumbnail.jpg`;
    }

    if (this._poster && !Number.isNaN(parseFloat(this._poster))) {
      return `https://image.mave.io/${this.embedController.spaceId}${this.embedController.embedId}.jpg?time=${this._poster}`;
    }

    if (this._poster) {
      return this._poster;
    }

    return `${this.embedController.cdnRoot}/poster.webp`;
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

    return `${this.embedController.cdnRoot}/${this.highestMP4Rendition.codec}_${this.highestMP4Rendition.size}.${this.highestMP4Rendition.container}`;
  }
  set source(value: string | null) {
    if (value) {
      const oldValue = this._source;
      this._source = value;
      this.requestUpdate('source', oldValue);
    }
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
    this.embedController.embed = this.embed;
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown) {
    super.requestUpdate(name, oldValue);
    if (name === 'embed') {
      this.embedController.embed = this.embed;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._metrics) {
      this._metrics.demonitor();
    }
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
    if (videoElement) {
      this._intersectionObserver.observe(videoElement);
      this._videoElement = videoElement as HTMLMediaElement;

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

    const sizes = ['sd', 'hd', 'fhd'];

    const highestRendition = renditions.reduce((highest, rendition) => {
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
              poster=${this._embed.poster.initial_frame_src}
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
  }

  renderPending() {
    return html`<video muted autoplay playsinline loop></video>`;
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
