import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { videoEvents } from '../utils/video_events';

export class Clip extends LitElement {
  private _embedId: string;
  @property()
  get embed(): string {
    return this._embedId;
  }
  set embed(value: string) {
    if (this._embedId != value) {
      this._embedId = value;
      this.requestUpdate('embed');
      this.embedController.embed = this.embed;
    }
  }

  @property() autoplay?: 'always' | 'off' | 'true' | 'scroll' | 'lazy' = 'lazy';
  @property() loop?: boolean;
  @property() quality = 'fhd';

  private _poster?: string;
  @property()
  get poster(): string {
    return this.embedController.embedFile('placeholder.jpg');
  }
  set poster(value: string | null) {
    if (value) {
      const oldValue = this._poster;
      this._poster = value;
      this.requestUpdate('poster', oldValue);
    }
  }

  private _token: string;
  @property()
  get token(): string {
    return this._token;
  }
  set token(value: string) {
    if (this._token != value) {
      this._token = value;
      this.requestUpdate('token');
      this.embedController.token = this._token;
    }
  }

  get source(): string {
    const { size } = this.highestMP4Rendition;

    if (this.autoplay == 'scroll') {
      return this.embedController.embedFile(`h264_${size}_keyframes.mp4`);
    }

    return this.embedController.embedFile(`h264_${size}.mp4`);
  }

  private _videoElement?: HTMLMediaElement;
  private _queue: { (): void }[] = [];

  @state() private _failedPlay = false;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.#intersected.bind(this)
  });

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

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
  private _canPlay: boolean;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.autoplay === 'scroll') document.addEventListener('scroll', this.#handleScroll.bind(this));

  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.autoplay === 'scroll') document.removeEventListener('scroll', this.#handleScroll.bind(this));

    if (this._metrics) {
      this._metrics.demonitor();
    }
  }

  #handleScroll() {
    const { height, top, bottom } = this.getBoundingClientRect();

    // in viewport
    if (top < window.innerHeight && top + height > 0) {
      if (this._videoElement) {
        const time = this._videoElement.duration / (bottom + window.scrollY) * (window.innerHeight - top);

        this._videoElement.currentTime = time;
        // console.log(time)
      }
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

  get paused(): boolean {
    return this._videoElement?.paused || true;
  }

  play() {
    if (this._videoElement) {
      this.#handlePlay();
    } else {
      this._queue.push(() => this.#handlePlay());
    }
  }

  pause() {
    if (this._videoElement) {
      this._videoElement.pause();
    } else {
      this._queue.push(() => this._videoElement?.pause());
    }
  }

  #handlePlay() {
    this._metrics.monitor();
    if (this._videoElement) {
      this._videoElement.muted = true;
      this._videoElement.play().catch(e => {
        this._failedPlay = true;
      });
    }

  }

  #handleVideo(videoElement?: Element) {
    if (!this._videoElement) {
      this._videoElement = videoElement as HTMLMediaElement;
    }

    this._intersectionObserver.observe(this._videoElement);

    // TODO: has no this._embed, because API is not called
    if (this._videoElement && this._embed && !this._metrics) {
      videoEvents.forEach((event) => {
        this._videoElement?.addEventListener(event, (e) => {

          if (!this._canPlay && this.autoplay === 'scroll' && event === 'canplay') {
            this._canPlay = true;
            this.#handleScroll();
          }

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

      this._metrics = new Metrics(this._videoElement, this.embed, metadata);
    }

    if (this._queue.length) {
      this._queue.forEach((fn) => fn());
      this._queue = [];
    }
  }

  #intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (!isIntersecting || this.autoplay === 'always') return;

      if (this.autoplay === 'lazy' || this.autoplay === 'true') {
        if (this._videoElement?.paused) {
          this.#handlePlay();
        }
      } else {
        if (!this._videoElement?.paused) this._videoElement?.pause();
      }
    }
  }

  #requestPlay() {
    if (this.autoplay === 'off' || this._failedPlay) {
      if (this._videoElement?.paused) {
        this.#handlePlay();
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
    return html`
      ${this.embedController.render({
        complete: (data) => {
          this._embed = data as Embed;
          if (!data) return;

          return html`
            <video
              @click=${this.#requestPlay}
              preload="metadata"
              style=${ifDefined(this._failedPlay || this.autoplay === 'off' ? "cursor: pointer" : undefined)}
              muted
              playsinline
              poster=${ifDefined(this._failedPlay ? this.poster : undefined)}
              ${ref(this.#handleVideo)}
              ?autoplay=${this.autoplay === 'always'}
              ?loop=${this.loop || true}
            >
            <source src=${this.source} type="video/mp4" />
          </video>
          `;
        },
      })}
    `;
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
