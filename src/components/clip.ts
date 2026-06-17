import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/data';
import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { ref } from 'lit/directives/ref.js';

import { Config } from '../config';
import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import {
  type ClipCodec,
  type ClipSource,
  clipMimeType,
  detectPlayableClipCodecs,
  selectClipPosterSource,
  selectClipSources,
} from '../utils/clip_sources';
import { videoEvents } from '../utils/video_events';

const DEFAULT_CLIP_CODECS: ClipCodec[] = ['av1', 'hevc', 'h264'];

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

  @property() fallback?: 'placeholder' | 'thumbnail' = 'placeholder';

  private _loop?: boolean;
  @property()
  set loop(value: boolean | string) {
    this._loop = value === '' || value == 'true' || value == true;
  }
  get loop(): boolean {
    return this._loop ?? false;
  }

  private _poster?: string;
  @property()
  get poster(): string | undefined {
    return selectClipPosterSource({
      explicitPoster: this._poster,
      fallback: this.fallback,
      poster: this._embed?.poster,
      toSrc: (file) => this.embedController.embedFile(file),
    });
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

  get sources(): ClipSource[] {
    if (!this._embed?.video?.renditions?.length) return [];

    return selectClipSources(this._embed.video.renditions, {
      autoplay: this.autoplay,
      devicePixelRatio: this.#devicePixelRatio,
      playableCodecs: this._playableCodecs,
      preferredCodecs: this._preferredCodecs,
      quality: this.quality,
      renderedLongEdge: this.#renderedLongEdge,
      toSrc: (file) => this.embedController.embedFile(file),
    });
  }

  private _videoElement?: HTMLMediaElement;
  private _videoEventsAttached = false;
  private _metricsEmbed?: string;
  private _resizeObserver?: ResizeObserver;
  private _scrollListenerActive = false;
  private _sourceSignature = '';
  private _codecCapabilitiesKey = '';
  private _handleScrollEvent = () => this.#handleScroll();
  private _queue: { (): void }[] = [];

  @state() private _failedPlay = false;
  @state() private _playableCodecs: ClipCodec[] = DEFAULT_CLIP_CODECS;
  @state() private _preferredCodecs: ClipCodec[] = DEFAULT_CLIP_CODECS;
  @state() private _observedLongEdge = 0;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.#intersected.bind(this),
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
      object-fit: var(--clip-fit, cover);
      object-position: var(--clip-position, 50% 50%);
    }
  `;

  private embedController = new EmbedController(this);
  private _metricsInstance?: Metrics;
  private _embed: Embed;
  private _canPlay: boolean;

  connectedCallback(): void {
    super.connectedCallback();
    this.#detectPlayableCodecs();
    this.#syncScrollListener();
    this.#observeRenderedSize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#stopScrollListener();
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;

    this._metricsInstance?.demonitor();
  }

  updated() {
    this.#syncScrollListener();
    this.#reloadVideoIfSourcesChanged();
    this.#detectCodecCapabilities();
  }

  #handleScroll() {
    if (typeof window === 'undefined') return;
    const { height, top, bottom } = this.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (this._videoElement) {
      if (!this._videoElement.duration) {
        this._videoElement.load();
      }

      let time = 0;

      if (top < viewportHeight && bottom > 0) {
        const totalScrollDistance = height + viewportHeight;
        const scrolledDistance = viewportHeight - top;
        const scrollFraction = scrolledDistance / totalScrollDistance;

        time = scrollFraction * this._videoElement.duration;
      }

      if (
        Number.isFinite(this._videoElement.duration) &&
        this._videoElement.duration > 0 &&
        time >= 0 &&
        time <= this._videoElement.duration
      ) {
        this._videoElement.currentTime = time;
      }
    }
  }

  set muted(value: boolean) {
    if (this._videoElement) {
      this._videoElement.muted = value;
    } else {
      this._queue.push(() => (this._videoElement!.muted = value));
    }
  }

  get muted(): boolean {
    return this._videoElement?.muted || false;
  }

  get paused(): boolean {
    return this._videoElement?.paused ?? true;
  }

  get duration(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this._videoElement && !isNaN(this._videoElement.duration)) {
        return resolve(this._videoElement.duration);
      }

      const listener = () => {
        this._videoElement?.addEventListener('loadedmetadata', () => {
          if (this._videoElement) {
            resolve(this._videoElement.duration);
          }
        });

        this._videoElement?.addEventListener('error', () => {
          reject(new Error('Failed to load video metadata.'));
        });
      };

      if (!this._videoElement) {
        this.addEventListener('mave:video_element_ready', () => {
          listener();
        });
      } else {
        listener();
      }
    });
  }

  set currentTime(value: number) {
    if (this._videoElement) {
      this._videoElement.currentTime = value;
    } else {
      this._queue.push(() => (this._videoElement!.currentTime = value));
    }
  }

  get currentTime(): number {
    if (!this._videoElement) return 0;
    return this._videoElement?.currentTime;
  }

  play(): Promise<void> {
    if (this._videoElement) {
      return this.#playVideo();
    }

    return new Promise((resolve, reject) => {
      this._queue.push(() => {
        this.#playVideo().then(resolve, reject);
      });
    });
  }

  pause() {
    if (this._videoElement) {
      this._videoElement.pause();
    } else {
      this._queue.push(() => this._videoElement?.pause());
    }
  }

  #handlePlay() {
    void this.#playVideo().catch(() => undefined);
  }

  #playVideo(): Promise<void> {
    if (!this._videoElement) {
      return Promise.reject(new Error('[mave-clip]: video element is not ready'));
    }

    this._metricsInstance?.monitor();
    this._videoElement.muted = true;

    return this._videoElement.play().catch((error) => {
      this._failedPlay = true;
      throw error;
    });
  }

  #handleVideo(videoElement?: Element) {
    if (!videoElement && !this._videoElement) return;

    if (!this._videoElement) {
      this._videoElement = videoElement as HTMLMediaElement;
      this.dispatchEvent(
        new CustomEvent('mave:video_element_ready', {
          detail: this._videoElement,
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (!this._videoElement) return;

    this._intersectionObserver.observe(this._videoElement);

    if (this._embed && !this._videoEventsAttached) {
      this._videoEventsAttached = true;

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
    }

    if (this._embed) {
      this.#syncMetrics();
    }

    if (this._queue.length) {
      this._queue.forEach((fn) => fn());
      this._queue = [];
    }
  }

  #syncMetrics() {
    if (!this._videoElement || !Config.metrics.enabled) return;
    if (this._metricsEmbed === this.embed) return;

    this._metricsInstance?.demonitor();
    this._metricsEmbed = this.embed;

    Metrics.config = {
      apiEndpoint: Config.metrics.endpoint,
    };

    this._metricsInstance = new Metrics(this._videoElement, this.embed, {
      component: 'clip',
    });
  }

  #intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (this.autoplay === 'always') return;

      if (isIntersecting && (this.autoplay === 'lazy' || this.autoplay === 'true')) {
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

  get #shouldLoop(): boolean {
    if (this._loop !== undefined) {
      return this._loop;
    }

    return this.autoplay !== 'off';
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
              style=${ifDefined(
                this._failedPlay || this.autoplay === 'off'
                  ? 'cursor: pointer'
                  : undefined,
              )}
              muted
              playsinline
              poster=${ifDefined(this.poster)}
              ${ref(this.#handleVideo)}
              ?autoplay=${this.autoplay === 'always'}
              ?loop=${this.#shouldLoop}
            >
              ${this.sources.map(
                (source) => html` <source src=${source.src} type=${source.type} /> `,
              )}
            </video>
          `;
        },
      })}
    `;
  }

  #detectPlayableCodecs() {
    if (typeof document === 'undefined') return;

    const video = document.createElement('video');
    this._playableCodecs = detectPlayableClipCodecs(video);
    this._preferredCodecs = this.#withH264Fallback(this._playableCodecs);
  }

  #detectCodecCapabilities() {
    if (typeof navigator === 'undefined') return;
    if (!navigator.mediaCapabilities?.decodingInfo) return;

    const modernCodecs = this._playableCodecs.filter((codec) => codec !== 'h264');
    if (!modernCodecs.length) return;

    const renderedLongEdge = Math.max(
      1,
      Math.ceil(this.#renderedLongEdge * this.#devicePixelRatio),
    );
    const key = `${renderedLongEdge}:${modernCodecs.join(',')}`;
    if (key === this._codecCapabilitiesKey) return;

    this._codecCapabilitiesKey = key;

    Promise.all(
      modernCodecs.map(async (codec) => {
        try {
          const result = await navigator.mediaCapabilities.decodingInfo({
            type: 'file',
            video: {
              bitrate: this.#bitrateForLongEdge(renderedLongEdge),
              contentType: clipMimeType(codec),
              framerate: 30,
              height: renderedLongEdge,
              width: renderedLongEdge,
            },
          });

          return {
            codec,
            powerEfficient: result.powerEfficient,
            smooth: result.smooth,
            supported: result.supported,
          };
        } catch {
          return {
            codec,
            powerEfficient: false,
            smooth: false,
            supported: true,
          };
        }
      }),
    ).then((results) => {
      if (!this.isConnected) return;
      if (key !== this._codecCapabilitiesKey) return;

      const preferredCodecs = results
        .filter((result) => result.supported)
        .sort((a, b) => {
          const powerEfficientDiff = Number(b.powerEfficient) - Number(a.powerEfficient);
          if (powerEfficientDiff !== 0) return powerEfficientDiff;

          const smoothDiff = Number(b.smooth) - Number(a.smooth);
          if (smoothDiff !== 0) return smoothDiff;

          return (
            DEFAULT_CLIP_CODECS.indexOf(a.codec) - DEFAULT_CLIP_CODECS.indexOf(b.codec)
          );
        })
        .map((result) => result.codec);

      this._playableCodecs = this.#withH264Fallback(preferredCodecs);
      this._preferredCodecs = this.#withH264Fallback(preferredCodecs);
    });
  }

  #bitrateForLongEdge(longEdge: number): number {
    if (longEdge >= 2560) return 6_000_000;
    if (longEdge >= 1920) return 4_000_000;
    if (longEdge >= 1280) return 2_000_000;
    return 1_000_000;
  }

  #withH264Fallback(codecs: readonly ClipCodec[]): ClipCodec[] {
    const uniqueCodecs = codecs.filter((codec, index) => codecs.indexOf(codec) === index);

    if (!uniqueCodecs.includes('h264')) uniqueCodecs.push('h264');
    return uniqueCodecs;
  }

  get #devicePixelRatio(): number {
    if (typeof window === 'undefined') return 1;
    return Math.max(window.devicePixelRatio || 1, 1);
  }

  get #renderedLongEdge(): number {
    if (this._observedLongEdge > 0) return this._observedLongEdge;

    if (typeof this.getBoundingClientRect !== 'function') return 0;

    const { width, height } = this.getBoundingClientRect();
    return Math.ceil(
      Math.max(width, height, this.clientWidth || 0, this.clientHeight || 0),
    );
  }

  #observeRenderedSize() {
    this.#updateRenderedSize();

    if (typeof ResizeObserver === 'undefined') return;

    this._resizeObserver = new ResizeObserver(() => this.#updateRenderedSize());
    this._resizeObserver.observe(this);
  }

  #updateRenderedSize() {
    if (typeof this.getBoundingClientRect !== 'function') return;

    const { width, height } = this.getBoundingClientRect();
    const longEdge = Math.ceil(
      Math.max(width, height, this.clientWidth || 0, this.clientHeight || 0),
    );

    if (longEdge !== this._observedLongEdge) {
      this._observedLongEdge = longEdge;
    }
  }

  #syncScrollListener() {
    if (this.autoplay === 'scroll') {
      if (typeof document === 'undefined' || this._scrollListenerActive) return;

      document.addEventListener('scroll', this._handleScrollEvent, { passive: true });
      this._scrollListenerActive = true;
      return;
    }

    this.#stopScrollListener();
  }

  #stopScrollListener() {
    if (typeof document === 'undefined' || !this._scrollListenerActive) return;

    document.removeEventListener('scroll', this._handleScrollEvent);
    this._scrollListenerActive = false;
  }

  #reloadVideoIfSourcesChanged() {
    if (!this._embed || !this._videoElement) return;

    const sourceSignature = this.sources.map((source) => source.src).join('|');
    if (sourceSignature === this._sourceSignature) return;

    this._sourceSignature = sourceSignature;

    if (!this._videoElement.currentSrc || this._videoElement.paused) {
      this._videoElement.load();
    }
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-clip')) {
    window.customElements.define('mave-clip', Clip);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-clip': Clip;
  }
}
