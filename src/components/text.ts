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
      this.reset();
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
        this._clickable = value === 'true' || value === '';
      } else {
        this._clickable = value;
      }
      this.requestUpdate('clickable');
    }
  }

  private _autoscroll: boolean = true;
  @property()
  get autoscroll(): boolean {
    return this._autoscroll;
  }
  set autoscroll(value) {
    if (this._autoscroll != value) {
      if (typeof value === 'string') {
        this._autoscroll = value === 'true' || value === '';
      } else {
        this._autoscroll = value;
      }
      this.requestUpdate('autoscroll');
    }
  }

  private captionController: CaptionController;
  private loop: boolean;

  @state()
  private player?: Player;

  private _wordIndex: number;
  get wordIndex(): number {
    return this._wordIndex;
  }
  set wordIndex(value: number) {
    if (this._wordIndex != value) {
      this._wordIndex = value;
      if (this.autoscroll) {
        const span = this.shadowRoot?.querySelector(
          `[data-word-id="word-${this.segmentIndex}-${this.wordIndex}"]`,
        );
        if (span && this._lastScrollTime + 2500 < Date.now()) {
          const thisRect = this.getBoundingClientRect();
          const spanRect = span.getBoundingClientRect();

          const relativeTop = spanRect.top - thisRect.top;

          if (relativeTop > 0) {
            const targetScroll = this.scrollTop + relativeTop;
            this.#smoothScroll(this, targetScroll - spanRect.height / 2);
          }
        }
      }
    }
  }

  #smoothScroll(element: HTMLElement, target: number, duration = 500) {
    const start = this.scrollTop;
    const change = target - start;
    let startTime: number | null = null;
    let isScrolling = false;

    function animateScroll(timestamp: number) {
      if (!startTime) {
        startTime = timestamp;
      }
      const timeElapsed = timestamp - startTime!;
      const progress = Math.min(timeElapsed / duration, 1);

      element.scrollTop = start + change * easeInOutQuad(progress);

      if (timeElapsed < duration && isScrolling) {
        requestAnimationFrame(animateScroll);
      } else {
        isScrolling = false;
      }
    }

    function easeInOutQuad(x: number): number {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    isScrolling = true;
    requestAnimationFrame(animateScroll);
  }

  private _segmentIndex: number;
  get segmentIndex(): number {
    return this._segmentIndex;
  }
  set segmentIndex(value: number) {
    if (this._segmentIndex != value) {
      this._segmentIndex = value;
    }
  }

  private _lastScrollTime: number = 0;

  @state()
  private currentTime: number = 0;

  @state()
  private captions: Caption;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    [part='word'] {
      background-color: var(--mave-text-highlight-background, #f9daaf);
      border-radius: 0.15em;
      box-decoration-break: clone;
      box-shadow: 0 0 0 2px var(--mave-text-highlight-outline, #a66f00);
      color: var(--mave-text-highlight-color, inherit);
      -webkit-box-decoration-break: clone;
    }

    [data-segment-id][role='button']:focus-visible {
      border-radius: 0.25em;
      outline: 2px solid var(--mave-text-segment-focus-outline, #2563eb);
      outline-offset: 3px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();

    this.addEventListener('scroll', this.#scrolling.bind(this));

    this.reset();
  }

  reset() {
    if (typeof document === 'undefined') return;
    this.loop = false;
    this.currentTime = 0;
    this.wordIndex = 0;
    this.segmentIndex = 0;
    const player = document.querySelector(`mave-player[embed="${this.embed}"]`) as Player | null;
    this.player = player ?? undefined;

    if (this.player) {
      this.player.addEventListener('play', () => {
        this.loop = true;
        this.loopUpdateTime();
      });
      this.player.addEventListener('pause', () => {
        this.loop = false;
      });
    }
  }

  #scrolling() {
    this._lastScrollTime = Date.now();
  }

  updateTime() {
    if (!this.player) return;
    this.currentTime = this.player.currentTime;
  }

  loopUpdateTime() {
    this.updateTime();
    setTimeout(() => {
      if (this.loop) {
        requestAnimationFrame(this.loopUpdateTime.bind(this));
      }
    }, 10);
  }

  #jumpToSegment(event: Event) {
    if (!this.isInteractive()) return;
    this.#seekToSegment(event.currentTarget as HTMLElement | null);
  }

  #jumpToSegmentKeydown(event: KeyboardEvent) {
    if (
      !this.isInteractive() ||
      (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar')
    ) {
      return;
    }
    event.preventDefault();
    this.#seekToSegment(event.currentTarget as HTMLElement | null);
  }

  #seekToSegment(segment: HTMLElement | null) {
    if (segment && this.player) {
      const time = segment.getAttribute('x-caption-segment-start');
      this.player.currentTime = Number(time);
      if (this.player.paused) {
        this.player.play();
      }
    }
  }

  private isInteractive() {
    return this.clickable && Boolean(this.player);
  }

  inRange(
    { start, end }: { start: number; end: number },
    part?: string,
    segmentIndex?: number,
    wordIndex?: number,
  ) {
    const withinValue = this.currentTime >= start && this.currentTime <= end;
    if (withinValue) {
      if (wordIndex) this.wordIndex = wordIndex;
      if (segmentIndex) this.segmentIndex = segmentIndex;
      return part ? part : true;
    } else {
      return undefined;
    }
  }

  segmentStyle() {
    if (!this.isInteractive()) return {};
    return {
      cursor: 'pointer',
    };
  }

  wordStyle(inRange: boolean) {
    if (!inRange || !this.highlight) return {};
    return {
      '--mave-text-highlight-background': this.highlight,
    };
  }

  render() {
    if (!this.captionController) return nothing;
    return this.captionController.render({
      complete: (data) => {
        this.captions = data as Caption;

        return html`
          <div>
            ${this.captions.segments.map(
              (segment, segmentIndex) => html`
                <p
                  data-segment-id="segment-${segmentIndex}"
                  role=${ifDefined(this.isInteractive() ? 'button' : undefined)}
                  style=${styleMap(this.segmentStyle())}
                  tabindex=${ifDefined(this.isInteractive() ? '0' : undefined)}
                  @click=${this.isInteractive() ? this.#jumpToSegment : nothing}
                  @keydown=${this.isInteractive() ? this.#jumpToSegmentKeydown : nothing}
                  part=${ifDefined(this.inRange(segment, 'segment'))}
                  x-caption-segment-start="${segment.start}"
                  x-caption-segment-end="${segment.end}"
                >
                  ${segment.words.map(
                    (word, wordIndex) => html`
                      <span
                        data-word-id="word-${segmentIndex}-${wordIndex}"
                        style=${styleMap(this.wordStyle(this.inRange(word) as boolean))}
                        part=${ifDefined(
                          this.inRange(word, 'word', segmentIndex, wordIndex),
                        )}
                        x-caption-word-start="${word.start}"
                        x-caption-word-end="${word.end}"
                        >${word.word.trim()}</span
                      >
                    `,
                  )}
                </p>
              `,
            )}
          </div>
        `;
      },
    });
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-text')) {
    window.customElements.define('mave-text', Text);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-text': Text;
  }
}
