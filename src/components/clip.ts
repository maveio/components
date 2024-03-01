import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { videoEvents } from '../utils/video_events';

import { Config } from '../config';


interface Source {
  media?: number | undefined;
  codec: string;
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
  @property() quality = 'auto';

  private _loop: boolean;
  @property()
  set loop(value: boolean | string) {
    this._loop = (value === '' || value == 'true' || value == true) ?? false;
  }
  get loop(): boolean {
    return this._loop;
  }

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
    const renditionType = this.autoplay === 'scroll' ? ['clip_keyframes'] : ['video', 'clip'];

    const renditions = this._embed.video.renditions
      .filter((r) =>
        (this.quality == 'auto' ? r.size !== 'uhd' : this.#sizes.indexOf(r.size) <= this.#sizes.indexOf(this.quality)) &&
        r.container === 'mp4' &&
        this.#codecs.includes(r.codec) &&
        (!r.type || renditionType.includes(r.type))
      )
      .sort((a, b) =>
        (a.size === b.size) ? this.#codecs.indexOf(a.codec) - this.#codecs.indexOf(b.codec) : this.#sizes.indexOf(b.size) - this.#sizes.indexOf(a.size))
      .map(r => {
        const media = this.#mediaWidth.find(m => m.size === r.size)?.media;
        const file = `${r.codec}_${r.size}${r.type && r.type != 'video' ? `_${r.type}` : ''}.mp4`

        return {
          media,
          src: this.embedController.embedFile(file),
          codec: this.#codecDescription[r.codec]
        };
      })


    const fallbackRenditions = this._embed.video.renditions
    .filter((r) =>
      this.#sizes.indexOf(r.size) <= this.#sizes.indexOf('fhd') &&
      r.container === 'mp4' &&
      this.#codecs.includes(r.codec) &&
      (!r.type || renditionType.includes(r.type))
    )
    .sort((a, b) =>
      this.#sizes.indexOf(b.size) - this.#sizes.indexOf(a.size)
    ); // Get the highest quality available up to fhd

    if (fallbackRenditions.length > 0) {
      const fallbackRendition = fallbackRenditions[0];
      const file = `${fallbackRendition.codec}_${fallbackRendition.size}${fallbackRendition.type && fallbackRendition.type != 'video' ? `_${fallbackRendition.type}` : ''}.mp4`;

      const fallbackSource = {
        media: undefined,
        src: this.embedController.embedFile(file),
        codec: this.#codecDescription[fallbackRendition.codec]
      };

      renditions.push(fallbackSource);
    }

    return renditions;
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
      overflow: hidden;
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
  private _metricsInstance?: Metrics;
  private _embed: Embed;
  private _canPlay: boolean;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.autoplay === 'scroll') document.addEventListener('scroll', this.#handleScroll.bind(this));

  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.autoplay === 'scroll') document.removeEventListener('scroll', this.#handleScroll.bind(this));

    this._metricsInstance?.demonitor();
  }

  #handleScroll() {
    const { height, top, bottom } = this.getBoundingClientRect();

    // in viewport
    if (top < window.innerHeight && top + height > 0) {
      if (this._videoElement && !this._videoElement.duration) {
        this._videoElement.load();
      }

      if (this._videoElement) {
        const time = this._videoElement.duration / (bottom + window.scrollY) * (window.innerHeight - top);
        if (time > 0 && time < this._videoElement.duration) {
          this._videoElement.currentTime = time;
        }
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
    const ua = navigator.userAgent;
    const isEdgeOnMac = /Edg/.test(ua) && /Mac OS/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isMacOS = /Mac OS/.test(ua);
    const isIOS = /iPhone|iPad/.test(ua);

    if ((isMacOS && (isSafari || isEdgeOnMac)) || isIOS) {
      return ['hevc', 'h264'];
    }

    // Default to av1, h264 for all other combinations
    return ['av1', 'h264'];
  }

  get #codecDescription() {
    return {
      av1: 'av01.0.08M.08.0.110.01.01.01.0,opus',
      hevc: 'hevc.01.00.78,mp4a.40.2',
      h264: 'avc1.64.00.28,mp4a.40.2',
    }
  }

  get #mediaWidth() {
    return [
      { size: 'qhd', media: 1280 },
      { size: 'fhd', media: 1080 },
      { size: 'hd', media: 720 },
      { size: 'sd', media: 640 }
    ]
  }

  #handlePlay() {
    this._metricsInstance?.monitor();
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

    if (this._videoElement && this._embed) {
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
        socketPath: Config.metrics.socket,
        apiKey: this._embed.metrics_key,
      };

      if(Config.metrics.enabled) this._metricsInstance = new Metrics(this._videoElement, this.embed, metadata);
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
              <source media=${ifDefined(source.media ? `(min-width: ${source.media}px)` : undefined)} src=${source.src} type=${`video/mp4; ${source.codec}`} />
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
