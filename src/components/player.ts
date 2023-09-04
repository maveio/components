import 'media-chrome';
import 'media-chrome/dist/experimental/media-captions-selectmenu.js';

import { IntersectionController } from '@lit-labs/observers/intersection_controller.js';
import { Metrics } from '@maveio/metrics';
import Hls from 'hls.js';
import { css, html, LitElement, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { styleMap } from 'lit-html/directives/style-map.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { ThemeLoader } from '../themes/loader';
import { videoEvents } from '../utils/video_events';

export class Player extends LitElement {
  @property() embed: string;
  @property({ attribute: 'aspect-ratio' }) aspect_ratio?: string;
  @property() width?: string;
  @property() subtitles?: [string];
  @property() height?: string;
  @property() autoplay?: 'always' | 'lazy';
  @property() controls?: 'full' | 'big' | 'none';
  @property() color?: string;
  @property() opacity?: string;
  @property() loop?: boolean;
  @property() theme = 'default';
  @property() token?: string;

  private _poster?: string;
  @property()
  get poster(): string {
    if (this._poster && this._poster == 'custom') {
      return this.embedController.embedFile('thumbnail.jpg');
    }

    if (this._poster && !Number.isNaN(parseFloat(this._poster))) {
      return `https://image.mave.io/${this.embedController.spaceId}${this.embedController.embedId}.jpg?time=${this._poster}`;
    }

    if (this._poster) {
      return this._poster;
    }

    return this.embedController.embedFile('poster.webp');
  }
  set poster(value: string | null) {
    if (value) {
      const oldValue = this._poster;
      this._poster = value;
      this.requestUpdate('poster', oldValue);
    }
  }

  @state() popped = false;

  @query("slot[name='end-screen']") endScreenElement: HTMLElement;

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

    slot[name='end-screen'] {
      display: none;
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 99;
      top: 0;
      left: 0;
    }
  `;

  private _intersectionObserver = new IntersectionController(this, {
    callback: this.#intersected.bind(this),
  });

  private embedController = new EmbedController(this);
  private _videoElement?: HTMLMediaElement;

  @state()
  private _embed: Embed;

  private _metrics: Metrics;
  private _intersected = false;

  private _queue: { (): void }[] = [];

  private hls: Hls = new Hls({
    startLevel: 3,
    capLevelToPlayerSize: true,
    xhrSetup: this.#xhrHLSSetup.bind(this),
  });

  pop() {
    this.popped = true;
  }

  close() {
    this.popped = false;
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

  connectedCallback() {
    super.connectedCallback();
    this.embedController.embed = this.embed;
    if (this.token) this.embedController.token = this.token;
    ThemeLoader.get(this.theme, `${this.embedController.cdnRoot}/themes/player`);
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

  #xhrHLSSetup(xhr: XMLHttpRequest, url: string) {
    const newUrl = new URL(url);
    if (this.token && !newUrl.searchParams.get('token')) {
      const params = new URLSearchParams();
      params.append('token', this.token);
      newUrl.search = params.toString();
    }
    xhr.open('GET', newUrl.toString());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._metrics) {
      this._metrics.demonitor();
    }
  }

  #handleVideo(videoElement?: Element) {
    if (videoElement && this._embed.video.src) {
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
        socketPath: '__MAVE_METRICS_SOCKET_ENDPOINT__',
        apiKey: this._embed.metrics_key,
      };

      const metadata = {
        component: 'player',
        video_id: this._embed.video.id,
        space_id: this._embed.space_id,
      };

      if (Hls.isSupported() && this.#hlsPath) {
        this.hls.loadSource(this.#hlsPath);
        this.hls.attachMedia(this._videoElement);
        this._metrics = new Metrics(this.hls, this.embed, metadata).monitor();
      } else if (
        this._videoElement.canPlayType('application/vnd.apple.mpegurl') &&
        this.#hlsPath
      ) {
        this._videoElement.src = this.#hlsPath;
        this._metrics = new Metrics(this._videoElement, this.embed, metadata).monitor();
      } else {
        this._videoElement.src = this.#srcPath;
        this._metrics = new Metrics(this._videoElement, this.embed, metadata).monitor();
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
      this._intersected = isIntersecting;
      this.#handleAutoplay();
    }
  }

  #videoPlayed() {
    const endScreen = this.querySelector('[slot="end-screen"]') as HTMLElement;
    if (endScreen) {
      this.endScreenElement.style.display = 'none';
      endScreen.style.display = 'none';
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
          this._videoElement.muted = true;
          this._videoElement?.play();
        }
      }
    }

    if (
      this._embed &&
      (this.autoplay == 'lazy' || this._embed.settings.autoplay == 'on_show')
    ) {
      if (this._intersected) {
        if (this._videoElement?.paused) {
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
      this._videoElement?.play();
    } else {
      this._videoElement?.pause();
    }
  }

  #updateEmbed(embed: Embed, shouldOverwrite = true) {
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
    return styleMap({
      '--primary-color': `${this.color || this._embed?.settings.color}${
        this.opacity || this._embed?.settings.opacity ? this._embed?.settings.opacity : ''
      }`,
      '--aspect-ratio':
        this.aspect_ratio == 'auto' ||
        (this._embed?.settings.aspect_ratio == 'auto' && !this.aspect_ratio)
          ? this._embed?.video.aspect_ratio
          : this.aspect_ratio || this._embed?.settings.aspect_ratio,
      '--width': this.width || this._embed?.settings.width,
      '--height': this.height || this._embed?.settings.height,
      '--media-control-bar-display':
        this.controls == 'full' ||
        (this._embed?.settings.controls == 'full' &&
          this.controls != 'big' &&
          this.controls != 'none')
          ? 'flex'
          : 'none',
      '--big-button-display':
        this.controls == 'big' ||
        (this._embed?.settings.controls == 'big' &&
          this.controls != 'full' &&
          this.controls != 'none')
          ? 'flex'
          : 'none',
    });
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
        if (this.subtitles && this.subtitles.includes(track.language)) {
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
    return html`
      <slot name="video">
        ${this.embedController.render({
          error: (error: unknown) =>
            html`<p>${error instanceof Error ? error.message : nothing}</p>`,
          complete: (data) => {
            if (!this._embed) {
              this._embed = data as Embed;
              this.#updateEmbed(this._embed, false);
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
      <slot name="end-screen"></slot>
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
