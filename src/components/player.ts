import 'media-chrome';
import 'media-chrome/dist/experimental/media-captions-selectmenu.js';

import { IntersectionController } from '@lit-labs/observers/intersection-controller.js';
import { Metrics } from '@maveio/metrics';
import Hls from 'hls.js';
import { css, html } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { property, query, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { ThemeLoader } from '../themes/loader';
import { videoEvents } from '../utils/video_events';

import { Config } from '../config';
import { MaveElement } from '../utils/mave_element';

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

  private _controls: string[] | string = [
    'play',
    'time',
    'seek',
    'volume',
    'fullscreen',
    'subtitles',
  ];
  @property()
  get controls(): string[] | string {
    return this._controls;
  }
  set controls(value: string | string[]) {
    if (typeof value === 'string') {
      this._controls = value.split(' ');
    } else {
      this._controls = value;
    }
  }

  _previousControls?: string[] | string;

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
    if (!this.embed || !this._embedObj) return '';

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
  private _embedObj: Embed;

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
    this.style.setProperty(
      'background',
      `center / contain no-repeat url(${this.poster})`,
    );
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
    if (this._embedObj.poster.renditions) {
      // get avif first, then webp, then jpg
      const rendition = this._embedObj.poster.renditions.find(
        (rendition) => rendition.container === 'avif' && rendition.type === type,
      );
      return rendition
        ? `${type}.avif`
        : this._embedObj.poster.renditions.find(
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
          if (event == 'ended') this.#showEndscreen();
          if (
            event == 'timeupdate' &&
            this._videoElement &&
            this._videoElement.duration - this._videoElement.currentTime < 5
          ) {
            const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;
            if (endScreen && endScreen.getAttribute('x-mave-end-shows') == 'near_end') {
              this.#showEndscreen();

              const remaining = this.querySelector("[name='mave-time-remaining']");
              if (remaining) {
                remaining.innerHTML = Math.floor(
                  this._videoElement.duration - this._videoElement.currentTime,
                ).toString();
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
              if (nextImage && nextImage.innerHTML == '') {
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
                  }
                }
              }
            }
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
      const trackElement = this._videoElement?.querySelector(
        `track[srclang="${this.active_subtitle}"]`,
      ) as HTMLTrackElement;
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

    const startScreen = this.querySelector('[slot="start-screen"]') as HTMLElement;
    if (startScreen) {
      (
        this.shadowRoot?.querySelector("slot[name='video']") as HTMLElement
      ).removeAttribute('style');
      this.startScreenElement.style.display = 'none';
      startScreen.style.display = 'none';
    }
  }

  #showEndscreen() {
    const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;

    if (endScreen) {
      if (endScreen.tagName === 'TEMPLATE') {
        const template = endScreen as HTMLTemplateElement;
        const parent = template.parentElement;

        const div = document.createElement('div');
        for (let attr of template.attributes) {
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
    const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;
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
  updateEmbed(embed: Embed, shouldOverwrite = true) {
    this._embedObj = embed;
    this.updateStylePoster();

    if (shouldOverwrite) {
      this.poster = this._embedObj.settings.poster;
      this.color = this._embedObj.settings.color;
      this.opacity = this._embedObj.settings.opacity
        ? (this._embedObj.settings.opacity as unknown as string)
        : undefined;
      this.aspect_ratio = this._embedObj.settings.aspect_ratio;
      this.width = this._embedObj.settings.width;
      this.height = this._embedObj.settings.height;
      this.autoplay =
        this._embedObj.settings.autoplay == 'on_show'
          ? 'lazy'
          : this._embedObj.settings.autoplay;
      this.controls = this._embedObj.settings.controls;
      this.loop = this._embedObj.settings.loop;
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

  get styles() {
    const style: { [key: string]: string } = {};

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
      style['--captions-display'] = this.controls.includes('subtitles') ? 'flex' : 'none';
    }

    style['--playbackrate-display'] = this.controls.includes('rate') ? 'flex' : 'none';

    if (!this.subtitles && !this.active_subtitle) {
      style['--captions-display'] = 'none';
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
      : this._embedObj.video.original;

    return src;
  }

  get #subtitles() {
    if (this._embedObj.subtitles.length > 0) {
      return this._embedObj.subtitles.map((track) => {
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
              this._embedObj = data as Embed;
              this.updateEmbed(this._embedObj, false);
            }
            if (!data) return;

            return staticHtml`<theme-${unsafeStatic(this.theme)} style=${this.styles}>
                <video
                  @click=${this.#requestPlay}
                  playsinline
                  ?loop=${this.loop || this._embedObj.settings.loop}
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
