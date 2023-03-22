import '../themes/main';

import { Metrics } from '@maveio/metrics';
import Hls from 'hls.js';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import { Embed } from '../embed/api';
import { EmbedController } from '../embed/controller';

@customElement('mave-player')
export class Player extends LitElement {
  @property() embed: string;

  static styles = css`
    :host {
      display: block;
    }

    :host,
    media-controller {
      width: 100%;
      max-height: 100vh;
    }
  `;

  private embedController = new EmbedController(this);
  private _embed: Embed;
  private _metrics: Metrics;

  private hls: Hls = new Hls({ startLevel: 3 });

  connectedCallback() {
    super.connectedCallback();
    this.embedController.embed = this.embed;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._metrics) {
      this._metrics.demonitor();
    }
  }

  handleVideo(videoElement?: Element) {
    if (videoElement && this._embed.video.src) {
      const video = videoElement as HTMLMediaElement;

      const metadata = {
        component: 'player',
        video_id: this._embed.video.id,
        space_id: this._embed.space_id,
      };

      if (this._embed.video.src.endsWith('.m3u8') && Hls.isSupported()) {
        this.hls.loadSource(this._embed.video.src);
        this.hls.attachMedia(video);
        this._metrics = new Metrics(this.hls, this.embed, metadata).monitor();
      } else {
        video.src = this._embed.video.src;
        this._metrics = new Metrics(video, this.embed, metadata).monitor();
      }
    }
  }

  handlePoster() {
    return this._embed.poster.image_src
      ? this._embed.poster.image_src
      : this._embed.poster.initial_frame_src;
  }

  render() {
    return html`
      <slot name="video">
        <mave-theme-main>
          ${this.embedController.render({
            // TODO: add loading state with loading player UI
            pending: () => html` <video slot="media"></video> `,
            error: (error: unknown) =>
              // TODO: add error state with error player UI
              html`<p>${error instanceof Error ? error.message : nothing}</p>`,
            complete: (data) => {
              this._embed = data as Embed;

              return html`
                <video
                  poster=${this.handlePoster()}
                  ${ref(this.handleVideo)}
                  slot="media"
                ></video>
              `;
            },
          })}
        </mave-theme-main>
      </slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-player': Player;
  }
}
