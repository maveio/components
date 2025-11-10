import 'media-chrome';
import 'media-chrome/menu';
import './audio-track-menu';

import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import type {
  AudioTracksUpdatedData,
  AudioTrackSwitchedData,
  MediaPlaylist,
} from 'hls.js';
import Hls from 'hls.js';
import { css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { MediaUIEvents } from 'media-chrome/dist/constants.js';

import { Config } from '../config';
import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { ThemeLoader } from '../themes/loader';
import { MaveElement } from '../utils/mave_element';
import { videoEvents } from '../utils/video_events';

export class Player extends MaveElement {
  private _embedId: string;
  @property()
  get embed(): string {
    return this._embedId;
  }
  set embed(value: string) {
    if (this._embedId != value) {
      this._embedId = value;
      // this.requestUpdate('embed');
      this.embedController.embed = this.embed;
      this.updateStylePoster();
      this.loadTheme();
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

  @property({ attribute: 'aspect-ratio' }) aspect_ratio?: string;

  @property() width?: string;
  @property() subtitles?: string | [string];
  @property({ attribute: 'active-subtitle' }) active_subtitle?: string;
  @property() height?: string;
  @property() autoplay?: 'always' | 'lazy' | 'true';
  @property() color?: string;
  @property() opacity?: string;

  private _loop: boolean;
  @property()
  set loop(value: boolean | string) {
    this._loop = (value === '' || value == 'true' || value == true) ?? false;
  }
  get loop(): boolean {
    return this._loop;
  }

  private _controls: string[] = [
    'play',
    'time',
    'seek',
    'volume',
    'audiotracks',
    'fullscreen',
    'subtitles',
  ];
  @property()
  get controls(): string[] {
    return this._controls;
  }
  set controls(value: string | string[]) {
    if (typeof value === 'string') {
      this._controls = value.split(' ');
    } else if (Array.isArray(value)) {
      this._controls = value;
    } else {
      this._controls = [];
    }
    this.requestUpdate('controls');
  }

  _previousControls?: string[];

  @property({ attribute: 'audiotracks' }) audioTracks?: 'auto' | 'on' | 'off';

  private _cache: boolean;
  @property()
  get cache(): boolean {
    return this._cache;
  }
  set cache(value: string | boolean) {
    if (this._cache != value) {
      if (typeof value === 'string') {
        this._cache = value === 'true' || value === '';
      } else {
        this._cache = false;
      }

      this.requestUpdate('caching');
      this.embedController.caching = this._cache;
    }
  }

  private _quality: string;
  @property()
  get quality(): string {
    const quality = this._quality;
    return quality;
  }
  set quality(value: string) {
    if (this._quality != value) {
      this._quality = value;
    }
  }

  private _theme: string;
  @property()
  get theme(): string {
    const theme = this._theme || 'default';
    return theme;
  }
  set theme(value: string) {
    if (this._theme != value) {
      this._theme = value;
      this.requestUpdate('theme');
      this.loadTheme();
    }
  }

  private _poster?: string;
  @property()
  get poster(): string | null {
    if (!this.embed || !this._embedObj || !this.#getImageRendition('thumbnail', 'jpg'))
      return null;

    if (this._poster && this._poster == 'custom') {
      return this.embedController.embedFile(this.#posterRendition('custom_thumbnail'));
    }

    if (
      this._poster &&
      (!Number.isNaN(parseFloat(this._poster)) || !Number.isNaN(parseInt(this._poster)))
    ) {
      if (
        this._embedObj.poster &&
        this._embedObj.poster.renditions &&
        this._embedObj.poster.renditions.find((p) => p.type == 'custom_thumbnail')
      ) {
        return this.embedController.embedFile(this.#posterRendition('custom_thumbnail'));
      } else {
        return `https://image.mave.io/${this.embedController.spaceId}${this.embedController.embedId}.jpg?time=${this._poster}`;
      }
    }

    if (this._poster) {
      return this._poster;
    }

    return this.embedController.embedFile(this.#posterRendition('thumbnail'));
  }
  set poster(value: string | null) {
    if (value) {
      this._poster = value;
      this.requestUpdate('poster');
    }
  }

  @state() popped = false;
  @state() private _isProcessing = false;

  @query("slot[name='end-screen']") endScreenElement: HTMLElement;
  @query("slot[name='start-screen']") startScreenElement: HTMLElement;

  private _startedPlaying = false;
  private _themeLoaded: string;
  private static readonly PROCESSING_REFRESH_INTERVAL = 5000;

  private _subtitlesText: HTMLElement;
  private _audioTrackCount = 0;
  private _cleanupHlsAudioTracks?: () => void;
  private _hlsAudioTracks: MediaPlaylist[] = [];
  private _hlsAudioTrackIdMap = new Map<string, number>();
  private _pendingAudioTrackSetup?: number;
  private _currentAudioTrackMenu?: Element | null;
  private _themeMutationObserver?: MutationObserver;
  private _themeMutationObserverRoot?: Node;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    video::cue {
      font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial,
        sans-serif;
      font-weight: 500;
      display: var(--subtitle-display, initial);
      opacity: var(--subtitle-opacity, 0);
    }

    video::-webkit-media-text-track-display {
      transform: var(--subtitle-transform, initial);
    }

    video:focus-visible {
      outline: 0;
    }

    :host,
    media-controller,
    theme-default,
    video {
      width: 100%;
      max-height: 100vh;
    }

    slot[name='start-screen'],
    slot[name='end-screen'] {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 99;
      top: 0;
      left: 0;
    }

    slot[name='end-screen'] {
      display: none;
    }

    .processing-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .processing-wrapper--overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      z-index: 60;
    }

    .processing-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 16px;
      text-align: center;
      color: #fff;
      background: rgba(0, 0, 0, 0.85);
      border-radius: inherit;
      background-size: cover;
      background-position: center;
    }

    .processing-state__spinner {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.25);
      border-top-color: #fff;
      animation: processing-spin 1s linear infinite;
    }

    .processing-state__text {
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    @keyframes processing-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.#intersected.bind(this),
  });

  private embedController = new EmbedController(this);
  private _videoElement?: HTMLMediaElement;

  @state()
  private _embedObj: Embed;

  private _metricsInstance?: Metrics;
  private _intersected = false;

  private _queue: { (): void }[] = [];
  private _processingRefreshHandle?: number;

  private _currentTrackLanguage: string;

  private hls?: Hls;
  private static readonly METADATA_READY_STATES = {
    HAVE_NOTHING:
      typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.HAVE_NOTHING : 0,
    HAVE_METADATA:
      typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.HAVE_METADATA : 1,
  };

  pop() {
    this.popped = true;
  }

  close() {
    this.popped = false;
  }

  @property()
  set muted(value: boolean | string) {
    const shouldBeMuted = (value === '' || value == 'true' || value == true) ?? false;

    if (this._videoElement) {
      this._videoElement.muted = shouldBeMuted;
    } else {
      this._queue.push(() => (this._videoElement!.muted = shouldBeMuted));
    }
  }

  get muted(): boolean {
    return this._videoElement?.muted || false;
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

  get paused(): boolean {
    if (!this._videoElement) return true;
    return this._videoElement.paused;
  }

  play() {
    if (this._videoElement && !this.embedController.loading) {
      this.#requestPlay();
    } else {
      this._queue.push(() => this.#requestPlay());
    }
  }

  restart() {
    if (this._videoElement) {
      this.pause();
      this._videoElement.currentTime = 0;
      this.play();
    }
  }

  pause() {
    if (this._videoElement) {
      this._videoElement.pause();
    } else {
      this._queue.push(() => this._videoElement?.pause());
    }
  }

  updateStylePoster() {
    if (this.poster) {
      this.style.setProperty(
        'background',
        `center / contain no-repeat url(${this.poster})`,
      );
    }
  }

  #xhrHLSSetup(xhr: XMLHttpRequest, url: string) {
    const newUrl = new URL(url);
    if (this.token && !newUrl.searchParams.get('token')) {
      const params = new URLSearchParams();
      params.append('token', this.token);
      newUrl.search = params.toString();
    }
    xhr.open('GET', newUrl.toString());
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.loadTheme();

    this.addEventListener(
      'mave:video_element_ready',
      this.#applySubtitleStyles.bind(this),
    );
  }

  #applySubtitleStyles() {
    this._videoElement?.addEventListener('webkitbeginfullscreen', () => {
      this.style.setProperty('--subtitle-opacity', '1');
    });

    this._videoElement?.addEventListener('webkitendfullscreen', () => {
      this.style.setProperty('--subtitle-opacity', '0');
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._metricsInstance?.demonitor();
    this.#clearProcessingRefresh();
    this._cleanupHlsAudioTracks?.();
    this._cleanupHlsAudioTracks = undefined;
    if (this._pendingAudioTrackSetup != null) {
      cancelAnimationFrame(this._pendingAudioTrackSetup);
      this._pendingAudioTrackSetup = undefined;
    }
    this._hlsAudioTrackIdMap.clear();
    this._hlsAudioTracks = [];
    this._currentAudioTrackMenu = undefined;
    this._themeMutationObserver?.disconnect();
    this._themeMutationObserver = undefined;
    this._themeMutationObserverRoot = undefined;
  }

  loadTheme() {
    if (this.embed && this._themeLoaded != this.theme) {
      if (this.theme && this.theme.endsWith('.js')) {
        ThemeLoader.external(this.theme);
      } else {
        ThemeLoader.get(this.theme, `${this.embedController.cdnRoot}/themes/player`);
      }
      this._themeLoaded = ThemeLoader.getTheme();
    }
  }

  #updateLoadingState() {
    if (!this._embedObj) return;

    const status = this.#manifestStatus();
    const hasStatus = typeof status === 'string';
    const lacksSource = !this.#hasPlayableSource();
    const needsProcessing = this.#manifestNeedsProcessing(status);
    const awaitingMetadata = hasStatus && this.#awaitingMetadata();

    if (needsProcessing && lacksSource) {
      this.#scheduleProcessingRefresh();
    } else {
      this.#clearProcessingRefresh();
    }

    const shouldShow = hasStatus && needsProcessing && (lacksSource || awaitingMetadata);

    if (this._isProcessing !== shouldShow) {
      this._isProcessing = shouldShow;
      this.requestUpdate();
    }
  }

  #hasPlayableSource() {
    const video = this._embedObj?.video;
    if (!video) return false;

    const renditions = Array.isArray(video.renditions) ? video.renditions : [];
    const hasHls = renditions.some(
      (rendition) => rendition.container === 'hls' && rendition.type === 'video',
    );
    const hasMp4 = renditions.some(
      (rendition) => rendition.container === 'mp4' && rendition.type === 'video',
    );

    return hasHls || hasMp4 || !!video.original;
  }

  #awaitingMetadata() {
    if (this._videoElement) {
      const duration = this._videoElement.duration;
      const readyState = this._videoElement.readyState;

      if (!isFinite(duration) || duration <= 0) {
        return true;
      }

      if (readyState <= Player.METADATA_READY_STATES.HAVE_METADATA) {
        return true;
      }

      return false;
    }

    const embedDuration = this._embedObj?.video?.duration;
    if (typeof embedDuration === 'number') {
      return embedDuration <= 0;
    }

    return false;
  }

  #manifestStatus() {
    return this._embedObj?.video?.status;
  }

  #manifestNeedsProcessing(status = this.#manifestStatus()) {
    if (typeof status === 'string') {
      return !['ready', 'playable'].includes(status);
    }
    return false;
  }

  #scheduleProcessingRefresh() {
    if (typeof window === 'undefined') return;
    if (this._processingRefreshHandle != null) return;

    this._processingRefreshHandle = window.setTimeout(() => {
      this._processingRefreshHandle = undefined;
      this.embedController.refresh().catch(() => undefined);
    }, Player.PROCESSING_REFRESH_INTERVAL);
  }

  #clearProcessingRefresh() {
    if (typeof window === 'undefined') return;
    if (this._processingRefreshHandle != null) {
      window.clearTimeout(this._processingRefreshHandle);
      this._processingRefreshHandle = undefined;
    }
  }

  #processingMessage(status?: Embed['video']['status']) {
    switch (status) {
      case 'waiting':
        return 'Waiting for video upload…';
      case 'uploading':
      case 'preparing':
      case 'playable':
        return 'Processing video…';
      case 'errored':
        return 'Video failed to process';
      default:
        return 'Preparing your video…';
    }
  }

  #destroyHlsInstance() {
    if (!this.hls) return;
    try {
      this.hls.destroy();
    } catch {
      // no-op
    }
    this.hls = undefined;
  }

  #getImageRendition(
    type: 'poster' | 'thumbnail' | 'custom_thumbnail',
    container: 'webp' | 'avif' | 'jpg',
  ) {
    return (
      this._embedObj.poster &&
      this._embedObj.poster.renditions &&
      this._embedObj.poster.renditions.find(
        (rendition) => rendition.container === container && rendition.type === type,
      )
    );
  }

  #posterRendition(type: 'poster' | 'thumbnail' | 'custom_thumbnail') {
    const t = type == 'custom_thumbnail' ? 'thumbnail' : type;
    const jpg = this.#getImageRendition(t, 'jpg');

    if (jpg) {
      // get avif first, then webp, then jpg

      // Safari has issues with posters that are not jpg
      // const avif = getImage('avif');
      // const webp = getImage('webp');

      // return avif
      //   ? `${type}.avif${avif.date ? `?date=${avif.date}` : ''}`
      //   : webp
      //   ? `${type}.webp${webp.date ? `?date=${webp.date}` : ''}`
      //   : `${type}.jpg${jpg && jpg.date ? `?date=${jpg.date}` : ''}`;

      return `${t}.jpg${jpg && jpg.date ? `?e=${jpg.date}` : ''}`;
    } else {
      return `${t}.jpg`;
    }
  }

  #getStartLevel(): number {
    const sizes = [
      {
        name: 'sd',
        width: 640,
      },
      {
        name: 'hd',
        width: 1280,
      },
      {
        name: 'fhd',
        width: 1920,
      },
      {
        name: 'qhd',
        width: 2560,
      },
      {
        name: 'uhd',
        width: 3840,
      },
    ];

    const size = sizes.find((size) => size.name == this.quality);
    if (size) {
      return sizes.indexOf(size);
    } else {
      return 2;
    }
  }

  #handleVideo(videoElement?: Element) {
    if (
      videoElement &&
      videoElement.tagName == 'VIDEO' &&
      (this.#hlsPath || this.#srcPath)
    ) {
      this._videoElement = videoElement as HTMLMediaElement;

      this.dispatchEvent(
        new CustomEvent('mave:video_element_ready', {
          detail: this._videoElement,
          bubbles: true,
          composed: true,
        }),
      );
      this._intersectionObserver.observe(this._videoElement);
      this.#updateLoadingState();

      videoEvents.forEach((event) => {
        this._videoElement?.addEventListener(event, (e) => {
          if (event == 'play') this.#videoPlayed();
          if (event == 'ended') this.#showEndscreen();
          if (
            event == 'timeupdate' &&
            this._videoElement &&
            this._videoElement.duration - this._videoElement.currentTime < 5
          ) {
            const endScreen = this.querySelector(
              '[slot="end-screen"], [data-slot="end-screen"]',
            ) as HTMLElement;
            if (endScreen && endScreen.getAttribute('x-mave-end-shows') == 'near_end') {
              this.#showEndscreen();

              const remaining = this.querySelector("[name='mave-time-remaining']");
              if (remaining) {
                const time = Math.floor(
                  this._videoElement.duration - this._videoElement.currentTime,
                );
                remaining.innerHTML = time <= 0 ? '0' : time.toString();
              }

              if (
                this._videoElement?.duration - this._videoElement?.currentTime <= 0 &&
                endScreen.getAttribute('x-mave-list-trigger-next') == 'true'
              ) {
                const list = [...document.querySelectorAll('mave-list')].find((list) =>
                  list.containsEmbed(this.embed),
                );
                if (list) {
                  const next = list.getNextForEmbed(this.embed);
                  if (next) this.emit(this.EVENT_TYPES.CLICK, { embedId: next.id });
                }
              }

              const nextImage = this.querySelector("[name='mave-list-next-image']");
              if (nextImage) {
                // get all mave-lists and use getNextForEmbed
                const list = [...document.querySelectorAll('mave-list')].find((list) =>
                  list.containsEmbed(this.embed),
                );
                if (list) {
                  const next = list.getNextForEmbed(this.embed);
                  if (next) {
                    const img = document.createElement('mave-img');
                    img.setAttribute('embed', next.id);
                    img.addEventListener('click', () => {
                      this.emit(this.EVENT_TYPES.CLICK, { embedId: next.id });
                      nextImage.innerHTML = '';
                    });
                    nextImage.appendChild(img);
                  } else {
                    nextImage.innerHTML = '';
                  }
                }
              }
            }
          }

          if (
            event === 'loadedmetadata' ||
            event === 'durationchange' ||
            event === 'loadeddata' ||
            event === 'emptied' ||
            event === 'waiting' ||
            event === 'stalled' ||
            event === 'error' ||
            event === 'playing' ||
            event === 'canplay' ||
            event === 'loadstart'
          ) {
            this.#updateLoadingState();
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

      Metrics.config = {
        socketPath: Config.metrics.socket,
        apiKey: this._embedObj.metrics_key,
      };

      const metadata = {
        component: 'player',
        video_id: this._embedObj.video.id,
        space_id: this._embedObj.space_id,
      };

      const isIOS = /iPhone|iPad/.test(navigator.userAgent);

      this.#destroyHlsInstance();

      if (Hls.isSupported() && this.#hlsPath && !isIOS) {
        this._cleanupHlsAudioTracks?.();
        this._cleanupHlsAudioTracks = undefined;
        if (this._pendingAudioTrackSetup != null) {
          cancelAnimationFrame(this._pendingAudioTrackSetup);
          this._pendingAudioTrackSetup = undefined;
        }
        this._hlsAudioTrackIdMap.clear();
        this._hlsAudioTracks = [];

        this.hls = new Hls({
          startLevel: this.#getStartLevel(),
          capLevelToPlayerSize: true,
          xhrSetup: this.#xhrHLSSetup.bind(this),
          maxBufferLength: 20,
          maxBufferSize: 20,
          backBufferLength: 60,
        });

        this.hls?.loadSource(this.#hlsPath);
        this.hls?.attachMedia(this._videoElement);
        this.#setupHlsAudioTracks();
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this.hls, this.embed, metadata);
      } else if (
        this._videoElement.canPlayType('application/vnd.apple.mpegurl') &&
        this.#hlsPath
      ) {
        this._cleanupHlsAudioTracks?.();
        this._cleanupHlsAudioTracks = undefined;
        if (this._pendingAudioTrackSetup != null) {
          cancelAnimationFrame(this._pendingAudioTrackSetup);
          this._pendingAudioTrackSetup = undefined;
        }
        this._hlsAudioTrackIdMap.clear();
        this._hlsAudioTracks = [];
        this._videoElement.src = this.#hlsPath;
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this._videoElement, this.embed, metadata);
      } else {
        this._cleanupHlsAudioTracks?.();
        this._cleanupHlsAudioTracks = undefined;
        if (this._pendingAudioTrackSetup != null) {
          cancelAnimationFrame(this._pendingAudioTrackSetup);
          this._pendingAudioTrackSetup = undefined;
        }
        this._hlsAudioTrackIdMap.clear();
        this._hlsAudioTracks = [];
        if (this.#srcPath) this._videoElement.src = this.#srcPath;
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this._videoElement, this.embed, metadata);
      }

      if (this._queue.length) {
        this._queue.forEach((fn) => fn());
        this._queue = [];
      }

      this.#handleAutoplay();
      this.#hideEndscreen();
    }
  }

  #intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (
        entries.length &&
        (entries[0].target.tagName == 'VIDEO' ||
          entries[0].target.tagName == 'MAVE-PLAYER')
      ) {
        this._intersected = isIntersecting;
        this.#handleAutoplay();
      }
    }
  }

  #videoPlayed() {
    if (this.active_subtitle && !this._startedPlaying) {
      let trackElement;
      if (this.active_subtitle == 'original' || this.subtitles == 'original') {
        const language = this._embedObj.video.language;
        trackElement = this._videoElement?.querySelector(
          `track[srclang="${language}"]`,
        ) as HTMLTrackElement;
      } else {
        trackElement = this._videoElement?.querySelector(
          `track[srclang="${this.active_subtitle}"]`,
        ) as HTMLTrackElement;
      }

      if (trackElement) {
        trackElement.track.mode = 'showing';
      }
    }

    this._startedPlaying = true;

    this.#hideEndscreen();

    if (this._previousControls) {
      this.controls = this._previousControls;
      this._previousControls = undefined;
    }

    const startScreen = this.querySelector(
      '[slot="start-screen"], [data-slot="start-screen"]',
    ) as HTMLElement;
    if (startScreen) {
      (
        this.shadowRoot?.querySelector("slot[name='video']") as HTMLElement
      ).removeAttribute('style');
      this.startScreenElement.style.display = 'none';
      startScreen.style.display = 'none';
    }
  }

  #showEndscreen() {
    const endScreen = this.querySelector(
      '[slot="end-screen"], [data-slot="end-screen"]',
    ) as HTMLElement;

    if (endScreen) {
      if (endScreen.tagName === 'TEMPLATE') {
        const template = endScreen as HTMLTemplateElement;
        const parent = template.parentElement;

        const div = document.createElement('div');
        for (const attr of template.attributes) {
          div.setAttribute(attr.name, attr.value);
        }
        div.style.display = 'block';

        div.innerHTML = template.innerHTML;
        parent?.replaceChild(div, template);
      }

      this.endScreenElement.style.display = 'block';
      endScreen.style.display = 'block';
      if (!this._previousControls) this._previousControls = this.controls;
      this.controls = 'none';
    }
  }

  #hideEndscreen() {
    const endScreen = this.querySelector(
      '[slot="end-screen"], [data-slot="end-screen"]',
    ) as HTMLElement;
    if (endScreen) {
      this.endScreenElement.style.display = 'none';
      endScreen.style.display = 'none';
    }
    if (this._previousControls) {
      this.controls = this._previousControls;
      this._previousControls = undefined;
    }
  }

  #handleAutoplay() {
    if (this._embedObj && this.autoplay == 'always') {
      if (this._videoElement?.paused) {
        this._metricsInstance?.monitor();
        this._videoElement.muted = true;
        this._videoElement?.play();
      }
    }

    if (
      this._embedObj &&
      (this.autoplay === 'lazy' ||
        this.autoplay === 'true' ||
        this._embedObj.settings.autoplay == 'on_show')
    ) {
      if (this._intersected) {
        if (this._videoElement?.paused) {
          this._metricsInstance?.monitor();
          this._videoElement.muted = true;
          this._videoElement?.play();
        }
      } else {
        if (
          this._videoElement &&
          !this._videoElement.paused &&
          this._videoElement.readyState > 2
        )
          this._videoElement?.pause();
      }
    }
  }

  #requestPlay() {
    if (this._videoElement?.paused) {
      this._metricsInstance?.monitor();
      this._videoElement?.play();
    } else {
      this._videoElement?.pause();
    }
  }

  // Used for updating the embed settings
  updateEmbed(embed: Embed) {
    this._embedObj = embed;
    this._audioTrackCount = embed.audio_tracks?.length ?? 0;
    this.updateStylePoster();
    this.#updateLoadingState();

    this.poster = this._embedObj.settings.poster;

    if (!this.attributes.getNamedItem('color')) {
      this.color = this._embedObj.settings.color;
    }

    if (!this.attributes.getNamedItem('opacity')) {
      this.opacity = this._embedObj.settings.opacity
        ? (this._embedObj.settings.opacity as unknown as string)
        : undefined;
    }

    if (!this.attributes.getNamedItem('aspect-ratio')) {
      this.aspect_ratio = this._embedObj.settings.aspect_ratio;
    }

    if (!this.attributes.getNamedItem('width')) {
      this.width = this._embedObj.settings.width;
    }

    if (!this.attributes.getNamedItem('height')) {
      this.height = this._embedObj.settings.height;
    }

    if (!this.attributes.getNamedItem('autoplay')) {
      this.autoplay =
        this._embedObj.settings.autoplay == 'on_show'
          ? 'lazy'
          : this._embedObj.settings.autoplay;
    }

    if (!this.attributes.getNamedItem('controls')) {
      this.controls = this._embedObj.settings.controls;
    }

    if (!this.attributes.getNamedItem('loop')) {
      this.loop = this._embedObj.settings.loop;
    }
  }

  #cuechange(e: Event) {
    const track = (e.target as HTMLTrackElement & { track: TextTrack }).track;
    const cues = track.activeCues as TextTrackCueList;

    if (track.mode == 'showing') {
      this._currentTrackLanguage = track.language;
    }

    if (!this._subtitlesText) {
      const subtitleText = this.shadowRoot
        ?.querySelector(`theme-${this._themeLoaded}`)
        ?.shadowRoot?.querySelector('#subtitles_text');
      if (subtitleText) {
        this._subtitlesText = subtitleText as HTMLElement;
      }
    }

    if (cues.length) {
      const cue = cues[0] as VTTCue;
      this._subtitlesText.style.opacity = '1';
      this._subtitlesText.style.transform = 'scale(1)';
      this._subtitlesText.innerHTML = cue.text.replace(/\n/g, '<br>');
    } else {
      this._subtitlesText.style.opacity = '0';
      this._subtitlesText.style.transform = 'scale(0.99)';
    }
  }

  #highestRendition(type: 'hls' | 'mp4') {
    const renditions = this._embedObj.video.renditions.filter(
      (rendition) => rendition.container == type,
    );

    const sizes = ['sd', 'hd', 'fhd', 'qhd', 'uhd'];

    if (!renditions || !renditions.length) return;

    const rendition = renditions.reduce((highest, rendition) => {
      const size = sizes.indexOf(rendition.size);
      if (size > sizes.indexOf(highest.size)) {
        return rendition;
      } else {
        return highest;
      }
    });

    return rendition;
  }

  get #mediaChromeRoot(): ShadowRoot | null {
    if (!this._themeLoaded) return null;
    const theme = this.shadowRoot?.querySelector(
      `theme-${this._themeLoaded}`,
    ) as HTMLElement & { shadowRoot?: ShadowRoot };
    return theme?.shadowRoot ?? null;
  }

  #observeThemeRoot(root: ShadowRoot) {
    if (this._themeMutationObserverRoot === root) return;

    this._themeMutationObserver?.disconnect();

    const observer = new MutationObserver(() => {
      this.#queueHlsAudioTrackSetup();
    });
    observer.observe(root, { childList: true, subtree: true });

    this._themeMutationObserver = observer;
    this._themeMutationObserverRoot = root;
  }

  #getAudioTrackElements(): {
    menu: (Element & { tracks?: any; selected?: string }) | null;
    button: Element | null;
  } {
    const root = this.#mediaChromeRoot;
    if (!root) {
      return { menu: null, button: null };
    }

    return {
      menu: root.querySelector('mave-audio-track-menu') as Element & {
        tracks?: any;
        selected?: string;
      },
      button: root.querySelector('mave-audio-track-menu-button'),
    };
  }

  #queueHlsAudioTrackSetup() {
    if (this._pendingAudioTrackSetup != null) return;
    this._pendingAudioTrackSetup = requestAnimationFrame(() => {
      this._pendingAudioTrackSetup = undefined;
      this.#setupHlsAudioTracks();
    });
  }

  #setupHlsAudioTracks() {
    if (!this.hls) return;

    const root = this.#mediaChromeRoot;
    if (root) {
      this.#observeThemeRoot(root);
    }

    const { menu, button } = this.#getAudioTrackElements();
    if (!menu || !button) {
      this.#queueHlsAudioTrackSetup();
      return;
    }

    if (menu !== this._currentAudioTrackMenu || !this._cleanupHlsAudioTracks) {
      this._cleanupHlsAudioTracks?.();

      const onAudioTracksUpdated = (
        _event: typeof Hls.Events.AUDIO_TRACKS_UPDATED,
        data: AudioTracksUpdatedData,
      ) => {
        this._hlsAudioTracks = data?.audioTracks ?? [];
        this.#updateAudioTrackMenuFromHls(this._hlsAudioTracks, this.hls?.audioTrack);
      };

      const onAudioTrackSwitched = (
        _event: typeof Hls.Events.AUDIO_TRACK_SWITCHED,
        data: AudioTrackSwitchedData,
      ) => {
        const activeId =
          data?.id ??
          (typeof this.hls?.audioTrack === 'number' ? this.hls.audioTrack : undefined);
        this.#updateAudioTrackMenuFromHls(this._hlsAudioTracks, activeId);
      };

      const onAudioTrackRequest = (event: Event) => {
        if (event.type !== MediaUIEvents.MEDIA_AUDIO_TRACK_REQUEST) return;
        const detail = (event as CustomEvent<string>).detail;
        if (detail == null) return;

        const trackId = this._hlsAudioTrackIdMap.get(String(detail));
        if (trackId == null || !this.hls) return;

        if (this.hls.audioTrack !== trackId) {
          this.hls.audioTrack = trackId;
          this.#updateAudioTrackMenuFromHls(this._hlsAudioTracks, trackId);
        }
      };

      menu.addEventListener(
        MediaUIEvents.MEDIA_AUDIO_TRACK_REQUEST,
        onAudioTrackRequest as EventListener,
      );
      this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, onAudioTracksUpdated);
      this.hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, onAudioTrackSwitched);

      this._cleanupHlsAudioTracks = () => {
        menu.removeEventListener(
          MediaUIEvents.MEDIA_AUDIO_TRACK_REQUEST,
          onAudioTrackRequest as EventListener,
        );
        this.hls?.off(Hls.Events.AUDIO_TRACKS_UPDATED, onAudioTracksUpdated);
        this.hls?.off(Hls.Events.AUDIO_TRACK_SWITCHED, onAudioTrackSwitched);
      };

      this._currentAudioTrackMenu = menu;

      if (this.hls.audioTracks?.length) {
        this._hlsAudioTracks = this.hls.audioTracks;
      }
    }

    const tracks =
      (this._hlsAudioTracks && this._hlsAudioTracks.length
        ? this._hlsAudioTracks
        : this.hls.audioTracks) ?? [];
    const activeId =
      typeof this.hls.audioTrack === 'number' ? this.hls.audioTrack : undefined;
    this.#updateAudioTrackMenuFromHls(tracks, activeId);
  }

  #updateAudioTrackMenuFromHls(tracks: MediaPlaylist[], activeId?: number) {
    const { menu, button } = this.#getAudioTrackElements();
    if (!menu || !button) {
      this.#queueHlsAudioTrackSetup();
      return;
    }

    this._hlsAudioTracks = tracks ?? [];
    this._hlsAudioTrackIdMap.clear();

    if (!tracks?.length) {
      if ('tracks' in menu) {
        (menu as any).tracks = [];
        (menu as any).selected = undefined;
      }

      this._audioTrackCount = 0;
      this.requestUpdate();
      return;
    }

    const list = tracks.map((track: MediaPlaylist, index: number) => {
      const rawId = track?.id ?? index;
      const id = String(rawId);
      this._hlsAudioTrackIdMap.set(id, rawId);
      const language = track?.lang ?? track?.attrs?.LANGUAGE;
      const labelCandidate = (track?.name ?? '').trim();
      const label =
        labelCandidate ||
        (typeof language === 'string' && language.trim()) ||
        `Track ${index + 1}`;
      const isEnabled =
        activeId != null ? rawId === activeId : track?.default ?? index === 0;

      return {
        id,
        language,
        label,
        enabled: isEnabled,
      };
    });

    if (!list.some((track) => track.enabled) && list.length) {
      list[0].enabled = true;
    }

    const enabledTrack = list.find((track) => track.enabled) ?? list[0];
    if ('tracks' in menu) {
      (menu as any).tracks = list;
      (menu as any).selected = enabledTrack?.id;
    }
    this._audioTrackCount = list.length;
    this.requestUpdate();
  }

  get styles() {
    const style: { [key: string]: string } = {};
    const embedHasSubtitles = !!this._embedObj?.subtitles?.length;
    const subtitlesDisabled =
      this.subtitles === 'none' || this.subtitles === 'off' || !embedHasSubtitles;
    const volumeControlEnabled =
      this.controls.includes('volume') || this.controls.includes('full');

    if (this.color || this._embedObj?.settings.color) {
      style['--primary-color'] = `${this.color || this._embedObj?.settings.color}${
        this.opacity || this._embedObj?.settings.opacity
          ? this._embedObj?.settings.opacity
          : ''
      }`;
    }
    if (
      this.aspect_ratio == 'auto' ||
      (this._embedObj?.settings.aspect_ratio == 'auto' && !this.aspect_ratio)
    ) {
      style['--aspect-ratio'] = this._embedObj?.video.aspect_ratio;
    } else {
      style['--aspect-ratio'] =
        this.aspect_ratio || this._embedObj?.settings.aspect_ratio;
    }

    if (this.width || this._embedObj?.settings.width) {
      style['--width'] = this.width || this._embedObj?.settings.width;
    }

    if (this.height || this._embedObj?.settings.height) {
      style['--height'] = this.height || this._embedObj?.settings.height;
    }

    if (
      !this.controls.includes('full') &&
      !this.controls.includes('big') &&
      !this.controls.includes('none')
    ) {
      style['--play-display'] = this.controls.includes('play') ? 'flex' : 'none';
      style['--time-display'] = this.controls.includes('time') ? 'flex' : 'none';
      style['--seek-bar-visibility'] = this.controls.includes('seek')
        ? 'visible'
        : 'hidden';
      style['--volume-display'] = this.controls.includes('volume') ? 'flex' : 'none';
      style['--fullscreen-display'] = this.controls.includes('fullscreen')
        ? 'flex'
        : 'none';
      style['--media-captions-menu-button-display'] = this.controls.includes('subtitles')
        ? 'flex'
        : 'none';
    }

    style['--playbackrate-display'] = this.controls.includes('rate') ? 'flex' : 'none';

    if (
      subtitlesDisabled ||
      // Don't change behaviour of older videos:
      (this._embedObj?.created_at < 1740674988 &&
        !this.subtitles &&
        !this.active_subtitle)
    ) {
      style['--media-captions-menu-button-display'] = 'none';
    }

    if (
      this.controls.includes('full') ||
      (this._embedObj?.settings.controls == 'full' &&
        !this.controls.includes('big') &&
        !this.controls.includes('none'))
    ) {
      style['--media-control-bar-display'] = 'flex';
    } else {
      style['--media-control-bar-display'] = 'none';
    }

    if (
      this.controls.includes('big') ||
      (this._embedObj?.settings.controls == 'big' &&
        !this.controls.includes('full') &&
        !this.controls.includes('none'))
    ) {
      style['--big-button-display'] = 'flex';
    } else {
      style['--big-button-display'] = 'none';
    }

    if (this._embedObj?.video.audio === false) {
      style['--media-mute-button-display'] = 'none';
    } else if (!volumeControlEnabled) {
      style['--media-mute-button-display'] = 'none';
    } else {
      style['--media-mute-button-display'] = 'flex';
    }

    const audioTrackCount = this._audioTrackCount ?? 0;
    const audioTracksControlEnabled =
      this.controls.includes('audiotracks') || this.controls.includes('full');

    const audioTracksPreference = this.audioTracks ?? 'auto';
    let audioTracksVisible = audioTracksControlEnabled && audioTrackCount > 1;

    if (audioTracksPreference === 'off') {
      audioTracksVisible = false;
    } else if (audioTracksPreference === 'on') {
      audioTracksVisible = audioTracksControlEnabled && audioTrackCount > 0;
    }

    style['--media-audio-track-menu-button-display'] = audioTracksVisible
      ? 'flex'
      : 'none';

    return styleMap(style);
  }

  #renderPlaceholder(
    message: string,
    {
      showSpinner = true,
      overlay = false,
    }: { showSpinner?: boolean; overlay?: boolean } = {},
  ) {
    const wrapperClasses = overlay
      ? 'processing-wrapper processing-wrapper--overlay'
      : 'processing-wrapper';
    return html`
      <div
        class=${wrapperClasses}
        style=${styleMap(this.#placeholderWrapperStyle(overlay))}
      >
        <div
          class="processing-state"
          style=${styleMap(this.#placeholderBackgroundStyle())}
        >
          ${showSpinner
            ? html`<div class="processing-state__spinner" aria-hidden="true"></div>`
            : nothing}
          <span class="processing-state__text">${message}</span>
        </div>
      </div>
    `;
  }

  #placeholderBackgroundStyle() {
    const style: { [key: string]: string } = {};
    const poster = this.poster;
    if (poster) {
      style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${poster})`;
    }
    return style;
  }

  #placeholderWrapperStyle(overlay = false) {
    if (overlay) {
      return {};
    }

    const style: { [key: string]: string } = { width: '100%' };
    const explicitWidth = this.width ?? this._embedObj?.settings.width;
    const explicitHeight = this.height ?? this._embedObj?.settings.height;

    if (explicitWidth && explicitWidth !== 'auto') {
      style.width = explicitWidth;
    }

    if (explicitHeight && explicitHeight !== 'auto') {
      style.height = explicitHeight;
    } else {
      style.minHeight = '200px';
    }

    const aspectRatio = this.#placeholderAspectRatio();
    if (aspectRatio) {
      style['aspect-ratio'] = aspectRatio;
    }

    return style;
  }

  #placeholderAspectRatio() {
    if (this.aspect_ratio && this.aspect_ratio !== 'auto') {
      return this.aspect_ratio;
    }

    if (
      this._embedObj?.settings.aspect_ratio &&
      this._embedObj.settings.aspect_ratio !== 'auto'
    ) {
      return this._embedObj.settings.aspect_ratio;
    }

    if (this._embedObj?.video?.aspect_ratio) {
      return this._embedObj.video.aspect_ratio;
    }

    return '16 / 9';
  }

  #renderProcessingPlaceholder(status?: Embed['video']['status']) {
    const showSpinner = status !== 'errored';
    return this.#renderPlaceholder(this.#processingMessage(status), {
      showSpinner,
      overlay: true,
    });
  }

  #renderPendingPlaceholder() {
    return this.#renderPlaceholder('Loading video…');
  }

  #renderErrorPlaceholder() {
    return this.#renderPlaceholder('Unable to load this video', { showSpinner: false });
  }

  #renderVideoTemplate() {
    if (!this._embedObj) return nothing;
    return staticHtml`<theme-${unsafeStatic(this._themeLoaded)} style=${this.styles}>
      <video
        @click=${this.#requestPlay}
        playsinline
        ?loop=${this.loop || this._embedObj.settings.loop}
        poster=${this.poster}
        ${ref(this.#handleVideo)}
        slot="media"
        crossorigin="anonymous"
      >
        ${this.#storyboard} ${this.#subtitles}
      </video>
    </theme-${unsafeStatic(this._themeLoaded)}>`;
  }

  get #hlsPath() {
    const highestRendition = this.#highestRendition('hls');
    if (highestRendition) {
      const params = new URLSearchParams();

      params.append('quality', highestRendition.size);
      return this.embedController.embedFile('playlist.m3u8', params);
    }
  }

  get #srcPath() {
    const duration = this._embedObj?.video?.duration;
    if (typeof duration === 'number' && duration <= 0) {
      return this._embedObj.video.original;
    }

    const highestRendition = this.#highestRendition('mp4');
    const src = highestRendition
      ? this.embedController.embedFile(`h264_${highestRendition?.size}.mp4`)
      : this._embedObj.video.original;

    return src;
  }

  get #subtitles() {
    if (this._embedObj.subtitles.length > 0) {
      const captionMenu = this.shadowRoot
        ?.querySelector(`theme-${this._themeLoaded}`)
        ?.shadowRoot?.querySelector('media-captions-menu');

      if (captionMenu) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(() => {
            if (
              this._subtitlesText &&
              captionMenu.getAttribute('mediasubtitlesshowing')
            ) {
              this._subtitlesText.style.opacity = '0';
            }
          });
        });

        observer.observe(captionMenu, { attributes: true });
      }

      return this._embedObj.subtitles.map((track) => {
        if (
          (this.subtitles && this.subtitles.includes(track.language)) ||
          (this.active_subtitle && this.active_subtitle == track.language) ||
          this.subtitles == 'all' ||
          ((this.subtitles == 'original' || this.active_subtitle == 'original') &&
            this._embedObj.video.language == track.language) ||
          !this.subtitles
        ) {
          return html`
            <track mode="hidden" @cuechange=${this.#cuechange} label=${
            track.label
          } kind="subtitles" srclang=${track.language} src=${track.path}></track>
          `;
        }
      });
    }
  }

  get #storyboard() {
    return html`<track
      label="thumbnails"
      default
      kind="metadata"
      src=${this.embedController.embedFile('storyboard.vtt')}></track>`;
  }

  render() {
    if (!this.embed) return;
    const startScreen = this.querySelector(
      '[slot="start-screen"], [data-slot="start-screen"]',
    ) as HTMLElement;

    return html`
      <slot
        name="video"
        style=${styleMap({
          display:
            startScreen && !this._startedPlaying && !this._isProcessing
              ? 'none'
              : 'block',
        })}
      >
        ${this.embedController.render({
          pending: () => nothing,
          error: () => this.#renderErrorPlaceholder(),
          complete: (data) => {
            if (!data) return this.#renderPendingPlaceholder();

            const embedData = data as Embed;
            this._embedObj = embedData;
            this.updateEmbed(embedData);

            return this.#renderVideoTemplate();
          },
        })}
      </slot>
      ${this._embedObj && this._isProcessing
        ? this.#renderProcessingPlaceholder(this._embedObj?.video?.status)
        : nothing}
      <slot name="start-screen"></slot>
      <slot name="end-screen"></slot>
      <slot name="hover-screen"></slot>
    `;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-player')) {
    window.customElements.define('mave-player', Player);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-player': Player;
  }
}
