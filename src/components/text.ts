import { css, html, LitElement, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Caption } from '../embed/api';
import { CaptionController } from '../embed/caption';
import { Player } from './player';

export class Text extends LitElement {
  private _embedId: string;
  @property()
  get embed(): string {
    return this._embedId;
  }
  set embed(value: string) {
    if (this._embedId != value) {
      this._embedId = value;
      this.captionController = new CaptionController(this, this.embed);
      this.requestUpdate('embed');
    }
  }

  @property() highlight: string;

  private _clickable: boolean = true;
  @property()
  get clickable(): boolean {
    return this._clickable;
  }
  set clickable(value) {
    if (this._clickable != value) {
      if (typeof value === 'string') {
        this._clickable = value === 'true';
      } else {
        this._clickable = value;
      }
      this.requestUpdate('clickable');
    }
  }


  private captionController: CaptionController;
  private player: Player;
  private loop: boolean;

  @state()
  private currentTime: number = 0;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    [part=word] {
      background-color: rgba(255, 210, 42, 0.5);
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    const player = document.querySelector(`mave-player[embed="${this.embed}"]`) as Player;
    if (player) {
      this.player = player;

      player.addEventListener('play', () => {
        this.loop = true;
        this.loopUpdateTime();
      })
      player.addEventListener('pause', () => {
        this.loop = false;
      })
    }
  }

  updateTime() {
    this.currentTime = this.player.currentTime;
  }

  loopUpdateTime() {
    this.updateTime();
    setTimeout(() => {
      if (this.loop) {
        requestAnimationFrame(this.loopUpdateTime.bind(this))
      }
    }, 10);
  }

  #jumpToSegment(event: Event) {
    if (this.clickable) {
      const segment = (event.target as HTMLElement).closest('p');
      if (segment && this.player) {
        const time = segment.getAttribute('x-caption-segment-start');
        this.player.currentTime = Number(time);
        if (this.player.paused) this.player.play();
      }
    }
  }

  inRange({ start, end }: { start: number, end: number }, part?: string) {
    const withinValue = this.currentTime >= start && this.currentTime <= end;
    if (withinValue) {
      return part ? part : true;
    } else {
      return undefined;
    }
  }

  segmentStyle() {
    if (!this.clickable) return {};
    return {
      'cursor': 'pointer'
    }
  }

  wordStyle(inRange: boolean) {
    if (!inRange) return {};
    return {
      'background-color': this.highlight,
    }
  }

  render() {
    return this.captionController.render({
      complete: (data) => {
        const caption = data as Caption;

        return html`
          <div>
            ${caption.segments.map((segment) => html`
              <p style=${styleMap(this.segmentStyle())} @click=${this.clickable ? this.#jumpToSegment : nothing} part=${ifDefined(this.inRange(segment, 'segment'))} x-caption-segment-start="${segment.start}" x-caption-segment-end="${segment.end}">
                ${segment.words.map((word) => html`
                  <span style=${styleMap(this.wordStyle(this.inRange(word) as boolean))} part=${ifDefined(this.inRange(word, 'word'))} x-caption-word-start="${word.start}" x-caption-word-end="${word.end}">${word.word.trim()}</span>
                `)}
              </p>
            `)}
          </div>
        `;
      }
    })
  }
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-text')) {
    window.customElements.define('mave-text', Text);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-text': Text;
  }
}
