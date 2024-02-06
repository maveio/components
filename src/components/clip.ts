import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref } from 'lit/directives/ref.js';

import { Embed, Rendition, RenditionsByCodec } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { videoEvents } from '../utils/video_events';


interface Source {
  media?: number | undefined ;
  src: string;
}

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

  get sources(): Source[] {
    if (this.autoplay == 'scroll') {
      const renditions = this.#highestRenditions(this.quality, ['clip_keyframes']);
      return renditions.map(r => ({ src: this.embedController.embedFile(`${r.codec}_${r.size}_clip_keyframes.mp4`) }));
    }

    if (this.quality == 'auto') {
      const renditions = this._embed.video.renditions.filter(
        (rendition) => (!rendition.type || ['video', 'clip'].includes(rendition.type)) && rendition.container === 'mp4' && rendition.size !== 'uhd'
      ).sort((a, b) => {
        // group by size and sort by codec
        if (a.size === b.size) {
          return this.#codecs.indexOf(a.codec) - this.#codecs.indexOf(b.codec);
        }
        return this.#sizes.indexOf(b.size) - this.#sizes.indexOf(a.size);
      }).map(r => {
        const media = this.#mediaWidth.find(m => m.size === r.size)?.media;

        if (r.codec !== 'h264') return { media, src: this.embedController.embedFile(`${r.codec}_${r.size}_clip.mp4`) };
        return { media, src: this.embedController.embedFile(`${r.codec}_${r.size}.mp4`) };
      });

      const fallbackRenditions = this.#highestRenditions('hd').map(r => {
        if (r.codec !== 'h264') return { src: this.embedController.embedFile(`${r.codec}_${r.size}_clip.mp4`) };
        return { src: this.embedController.embedFile(`${r.codec}_${r.size}.mp4`) };
      });

      return [...renditions, ...fallbackRenditions];

    } else {
      const renditions = this.#highestRenditions();
      return renditions.map(r => {
        if (r.codec !== 'h264') return { src: this.embedController.embedFile(`${r.codec}_${r.size}_clip.mp4`) };
        return { src: this.embedController.embedFile(`${r.codec}_${r.size}.mp4`) };
      });
    }
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

  get #sizes() {
    return ['sd', 'hd', 'fhd', 'qhd', 'uhd'];
  }

  get #codecs() {
    return ['av1', 'hevc', 'h264'];
  }

  get #mediaWidth() {
    return [
      { size: 'qhd', media: 1280 },
      { size: 'fhd', media: 1280 },
      { size: 'hd', media: 720 },
      { size: 'sd', media: 640 }
    ]
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

  #highestRenditions(quality = this.quality, types = ['clip', 'video'], container = 'mp4'): Rendition[] {
    const renditions = this._embed.video.renditions.filter(
      (rendition) => (!rendition.type || types.includes(rendition.type)) && rendition.container === container,
    );

    // Group renditions by codec
    const renditionsByCodec: RenditionsByCodec = renditions.reduce((acc, rendition) => {
      const codec = rendition.codec;
      if (!acc[codec]) acc[codec] = [];
      acc[codec]!.push(rendition);
      return acc;
    }, {} as RenditionsByCodec);

    // Find the highest rendition for each codec
    const highestRenditions = Object.values(renditionsByCodec).map(codecRenditions => {
      return codecRenditions!
        .filter((rendition) => {
          const qualityIndex = this.#sizes.indexOf(quality);
          const renditionIndex = this.#sizes.indexOf(rendition.size);
          return renditionIndex <= qualityIndex;
        })
        .reduce((highest, rendition) => {
          const size = this.#sizes.indexOf(rendition.size);
          if (size > this.#sizes.indexOf(highest.size)) {
            return rendition;
          } else {
            return highest;
          }
        });
    });

    return highestRenditions.sort((a, b) => {
      return this.#codecs.indexOf(a.codec) - this.#codecs.indexOf(b.codec);
    }).filter(r => r) as Rendition[];
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
            ${this.sources.map((source) => html`
              <source media=${ifDefined(source.media ? `(min-width: ${source.media}px)` : undefined)} src=${source.src} type="video/mp4" />
            `)}
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
