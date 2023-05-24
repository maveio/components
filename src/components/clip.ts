import { IntersectionController } from '@lit-labs/observers/intersection_controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';

export class Clip extends LitElement {
  @property() embed: string;
  @property() autoplay?: 'always' | 'off' | 'lazy';
  @property() loop?: boolean;

  @state() _source = false;

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
      if (!this._source) this._source = true;
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

      Metrics.socket_path = '__MAVE_METRICS_SOCKET_ENDPOINT__';
      this._metrics = new Metrics(this._videoElement, this.embed, metadata).monitor();
    }

    if (this._queue.length) {
      this._queue.forEach((fn) => fn());
      this._queue = [];
    }
  }

  intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (isIntersecting && (this.autoplay === 'lazy' || this.autoplay === undefined)) {
        if (!this._source) this._source = true;
        if (this._videoElement?.paused) this._videoElement?.play();
      } else {
        if (!this._videoElement?.paused) this._videoElement?.pause();
      }
    }
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
              muted
              playsinline
              ?autoplay=${this.autoplay === 'always' ? true : false}
              ?loop=${this.loop || true}
              ${ref(this.handleVideo)}
              poster=${this._embed.poster.initial_frame_src}
            >
              ${this._source
                ? html` <source
                    src=${this._embed.video.sources.mp4['720p']}
                    type="video/${this._embed.video.filetype || 'mp4'}"
                  />`
                : nothing}
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
