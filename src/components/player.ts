import 'media-chrome';
import 'media-chrome/dist/experimental/media-captions-selectmenu.js';

import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import Hls from 'hls.js';
import { css, html, LitElement } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { property, query, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { ThemeLoader } from '../themes/loader';
import { videoEvents } from '../utils/video_events';

import { Config } from '../config';

export class Player extends LitElement {
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
    } else {
      this._controls = value;
    }
  }

  private _cache: boolean;
  @property({ attribute: 'cache', type: Boolean })
  get caching(): boolean {
    return this._cache;
  }
  set caching(value: boolean) {
    if (this._cache != value) {
      this._cache = value;
      this.requestUpdate('caching');

      if (typeof value === 'string') {
        this._cache = value === 'true' || value === '';
      } else {
        this._cache = value;
      }

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
  get poster(): string {
    if (!this.embed || !this._embed) return '';

    if (this._poster && this._poster == 'custom') {
      return this.embedController.embedFile(this.#posterRendition('thumbnail'));
    }

    if (this._poster && !Number.isNaN(parseFloat(this._poster))) {
      return `https://image.mave.io/${this.embedController.spaceId}${this.embedController.embedId}.jpg?time=${this._poster}`;
    }

    if (this._poster) {
      return this._poster;
    }

    return this.embedController.embedFile(this.#posterRendition('poster'));
  }
  set poster(value: string | null) {
    if (value) {
      this._poster = value;
      this.requestUpdate('poster');
    }
  }

  @state() popped = false;

  @query("slot[name='end-screen']") endScreenElement: HTMLElement;
  @query("slot[name='start-screen']") startScreenElement: HTMLElement;

  private _startedPlaying = false;
  private _themeLoaded = false;

  private _subtitlesText: HTMLElement;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    video::cue {
      font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial,
        sans-serif;
      font-weight: 500;
    }

    video:focus-visible {
      outline: 0;
    }

    video {
      height: fit-content;
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
  `;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.#intersected.bind(this),
  });

  private embedController = new EmbedController(this);
  private _videoElement?: HTMLMediaElement;

  @state()
  private _embed: Embed;

  private _metricsInstance?: Metrics;
  private _intersected = false;

  private _queue: { (): void }[] = [];

  private _currentTrackLanguage: string;

  private hls?: Hls;

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

  get paused(): boolean {
    if (!this._videoElement) return true;
    return this._videoElement.paused;
  }

  play() {
    if (this._videoElement) {
      this.#requestPlay();
    } else {
      this._queue.push(() => this.#requestPlay());
    }
  }

  pause() {
    if (this._videoElement) {
      this._videoElement.pause();
    } else {
      this._queue.push(() => this._videoElement?.pause());
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
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._metricsInstance?.demonitor();
  }

  loadTheme() {
    if (this.embed && !this._themeLoaded) {
      ThemeLoader.get(this.theme, `${this.embedController.cdnRoot}/themes/player`);
      this._themeLoaded = true;
    }
  }

  #posterRendition(type: 'poster' | 'thumbnail') {
    if (this._embed.poster.renditions) {
      // get avif first, then webp, then jpg
      const rendition = this._embed.poster.renditions.find(
        (rendition) => rendition.container === 'avif' && rendition.type === type,
      );
      return rendition
        ? `${type}.avif`
        : this._embed.poster.renditions.find(
            (rendition) => rendition.container === 'webp' && rendition.type === type,
          )
        ? `${type}.webp`
        : `${type}.jpg`;
    } else {
      // fallback to jpg
      return `${type}.jpg`;
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
      this._intersectionObserver.observe(this._videoElement);

      videoEvents.forEach((event) => {
        this._videoElement?.addEventListener(event, (e) => {
          if (event == 'play') this.#videoPlayed();
          if (event == 'ended') this.#videoEnded();
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
        apiKey: this._embed.metrics_key,
      };

      const metadata = {
        component: 'player',
        video_id: this._embed.video.id,
        space_id: this._embed.space_id,
      };

      if (Hls.isSupported() && this.#hlsPath) {
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
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this.hls, this.embed, metadata);
      } else if (
        this._videoElement.canPlayType('application/vnd.apple.mpegurl') &&
        this.#hlsPath
      ) {
        this._videoElement.src = this.#hlsPath;
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this._videoElement, this.embed, metadata);
      } else {
        this._videoElement.src = this.#srcPath;
        if (Config.metrics.enabled)
          this._metricsInstance = new Metrics(this._videoElement, this.embed, metadata);
      }

      if (this._queue.length) {
        this._queue.forEach((fn) => fn());
        this._queue = [];
      }

      this.#handleAutoplay();
    }
  }

  #intersected(entries: IntersectionObserverEntry[]) {
    for (const { isIntersecting } of entries) {
      if (entries.length && entries[0].target.tagName == 'VIDEO') {
        this._intersected = isIntersecting;
        this.#handleAutoplay();
      }
    }
  }

  #videoPlayed() {
    if (this.active_subtitle && !this._startedPlaying) {
      const trackElement = this._videoElement?.querySelector(
        `track[srclang="${this.active_subtitle}"]`,
      ) as HTMLTrackElement;
      if (trackElement) {
        trackElement.track.mode = 'showing';
      }
    }

    this._startedPlaying = true;

    const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;
    if (endScreen) {
      this.endScreenElement.style.display = 'none';
      endScreen.style.display = 'none';
    }

    const startScreen = this.querySelector('[slot="start-screen"]') as HTMLElement;
    if (startScreen) {
      (
        this.shadowRoot?.querySelector("slot[name='video']") as HTMLElement
      ).removeAttribute('style');
      this.startScreenElement.style.display = 'none';
      startScreen.style.display = 'none';
    }
  }

  #videoEnded() {
    const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;
    if (endScreen) {
      this.endScreenElement.style.display = 'block';
      endScreen.style.display = 'block';
    }
  }

  #handleAutoplay() {
    if (this._embed && this.autoplay == 'always') {
      if (this._intersected) {
        if (this._videoElement?.paused) {
          this._metricsInstance?.monitor();
          this._videoElement.muted = true;
          this._videoElement?.play();
        }
      }
    }

    if (
      this._embed &&
      (this.autoplay === 'lazy' ||
        this.autoplay === 'true' ||
        this._embed.settings.autoplay == 'on_show')
    ) {
      if (this._intersected) {
        if (this._videoElement?.paused) {
          this._metricsInstance?.monitor();
          this._videoElement.muted = true;
          this._videoElement?.play();
        }
      } else {
        if (!this._videoElement?.paused) this._videoElement?.pause();
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
  updateEmbed(embed: Embed, shouldOverwrite = true) {
    this._embed = embed;

    if (shouldOverwrite) {
      this.poster = this._embed.settings.poster;
      this.color = this._embed.settings.color;
      this.opacity = this._embed.settings.opacity
        ? (this._embed.settings.opacity as unknown as string)
        : undefined;
      this.aspect_ratio = this._embed.settings.aspect_ratio;
      this.width = this._embed.settings.width;
      this.height = this._embed.settings.height;
      this.autoplay =
        this._embed.settings.autoplay == 'on_show'
          ? 'lazy'
          : this._embed.settings.autoplay;
      this.controls = this._embed.settings.controls;
      this.loop = this._embed.settings.loop;
    }
  }

  #cuechange(e: Event) {
    const track = (e.target as HTMLTrackElement & { track: TextTrack }).track;
    const cues = track.activeCues as TextTrackCueList;

    if (track.mode == 'showing') {
      this._currentTrackLanguage = track.language;
    }

    if (!navigator.userAgent.includes('Mobi')) {
      if (track.mode != 'hidden') track.mode = 'hidden';

      if (!this._subtitlesText) {
        const subtitleText = this.shadowRoot
          ?.querySelector(`theme-${this.theme}`)
          ?.shadowRoot?.querySelector('#subtitles_text');
        if (subtitleText) {
          this._subtitlesText = subtitleText as HTMLElement;
        }
      }

      if (this._currentTrackLanguage != track.language) return;

      const option = this.shadowRoot
        ?.querySelector(`theme-${this.theme}`)
        ?.shadowRoot?.querySelector('media-captions-selectmenu')
        ?.shadowRoot?.querySelector('media-captions-listbox')
        ?.shadowRoot?.querySelector('media-chrome-option[part="option option-selected"]');

      if (option && option.getAttribute('value') == 'off') {
        this._subtitlesText.innerHTML = '';
        this._subtitlesText.style.opacity = '0';
        return;
      }

      if (cues.length) {
        const cue = cues[0] as VTTCue;
        this._subtitlesText.style.opacity = '1';
        this._subtitlesText.innerHTML = cue.text;
      } else {
        this._subtitlesText.style.opacity = '0';
      }
    }
  }

  #highestRendition(type: 'hls' | 'mp4') {
    const renditions = this._embed.video.renditions.filter(
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

  get styles() {
    const style: { [key: string]: string } = {};

    if (this.color || this._embed?.settings.color) {
      style['--primary-color'] = `${this.color || this._embed?.settings.color}${
        this.opacity || this._embed?.settings.opacity ? this._embed?.settings.opacity : ''
      }`;
    }

    if (
      this.aspect_ratio == 'auto' ||
      (this._embed?.settings.aspect_ratio == 'auto' && !this.aspect_ratio)
    ) {
      style['--aspect-ratio'] = this._embed?.video.aspect_ratio;
    } else {
      style['--aspect-ratio'] = this.aspect_ratio || this._embed?.settings.aspect_ratio;
    }

    if (this.width || this._embed?.settings.width) {
      style['--width'] = this.width || this._embed?.settings.width;
    }

    if (this.height || this._embed?.settings.height) {
      style['--height'] = this.height || this._embed?.settings.height;
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
      style['--captions-display'] = this.controls.includes('subtitles') ? 'flex' : 'none';
    }

    style['--playbackrate-display'] = this.controls.includes('rate') ? 'flex' : 'none';

    if (!this.subtitles && !this.active_subtitle) {
      style['--captions-display'] = 'none';
    }

    if (
      this.controls.includes('full') ||
      (this._embed?.settings.controls == 'full' &&
        !this.controls.includes('big') &&
        !this.controls.includes('none'))
    ) {
      style['--media-control-bar-display'] = 'flex';
    } else {
      style['--media-control-bar-display'] = 'none';
    }

    if (
      this.controls.includes('big') ||
      (this._embed?.settings.controls == 'big' &&
        !this.controls.includes('full') &&
        !this.controls.includes('none'))
    ) {
      style['--big-button-display'] = 'flex';
    } else {
      style['--big-button-display'] = 'none';
    }

    if (this._embed?.video.audio === false) {
      style['--media-volume-display'] = 'none';
    } else {
      style['--media-volume-display'] = 'inline-flex';
    }

    return styleMap(style);
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
    const highestRendition = this.#highestRendition('mp4');
    const src = highestRendition
      ? this.embedController.embedFile(`h264_${highestRendition?.size}.mp4`)
      : this._embed.video.original;

    return src;
  }

  get #subtitles() {
    if (this._embed.subtitles.length > 0) {
      return this._embed.subtitles.map((track) => {
        if (
          (this.subtitles && this.subtitles.includes(track.language)) ||
          (this.active_subtitle && this.active_subtitle == track.language) ||
          this.subtitles == 'all'
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
    const startScreen = this.querySelector('[slot="start-screen"]') as HTMLElement;

    return html`
      <slot
        name="video"
        style=${styleMap({
          display: startScreen && !this._startedPlaying ? 'none' : 'block',
        })}
      >
        ${this.embedController.render({
          complete: (data) => {
            if (!this._embed) {
              this._embed = data as Embed;
              this.updateEmbed(this._embed, false);
            }
            if (!data) return;

            return staticHtml`<theme-${unsafeStatic(this.theme)} style=${this.styles}>
                <video
                  @click=${this.#requestPlay}
                  playsinline
                  ?loop=${this.loop || this._embed.settings.loop}
                  poster=${this.poster}
                  ${ref(this.#handleVideo)}
                  slot="media"
                  crossorigin="anonymous"
                >
                  ${this.#storyboard}
                  ${this.#subtitles}
                </video>
            </theme-${unsafeStatic(this.theme)}>`;
          },
        })}
      </slot>
      <slot name="start-screen"></slot>
      <slot name="end-screen"></slot>
      <slot name="hover-screen"></slot>
    `;
  }
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-player')) {
    window.customElements.define('mave-player', Player);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-player': Player;
  }
}
