import { css, html, LitElement, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Caption } from '../embed/api';
import { CaptionController } from '../embed/caption';
import { Player } from './player';

type HighlightMode = 'sentence' | 'word';
type ActiveWordRange = { startIndex: number; endIndex: number };
type SentenceWordRange = ActiveWordRange & { start: number; end: number; nextStart?: number };
type HighlightPosition = 'single' | 'start' | 'middle' | 'end';

export class Text extends LitElement {
  private static readonly SENTENCE_HIGHLIGHT_HOLD_SECONDS = 0.35;

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
  @property({ attribute: 'highlight-mode' }) highlightMode: HighlightMode = 'sentence';
  @property({ attribute: 'transcript-label' }) transcriptLabel: string = 'Transcript';

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

  @state()
  private rovingSegmentIndex: number = 0;

  @state()
  private transcriptHasFocus: boolean = false;

  private _wordIndex: number;
  get wordIndex(): number {
    return this._wordIndex;
  }
  set wordIndex(value: number) {
    if (this._wordIndex != value) {
      this._wordIndex = value;
      if (this.autoscroll) {
        this.#scrollActiveWordIntoView();
      }
    }
  }

  #smoothScroll(element: HTMLElement, target: number, duration = 500) {
    const start = element.scrollTop;
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

  #scrollActiveWordIntoView() {
    const span = this.shadowRoot?.querySelector(
      `[data-word-id="word-${this.segmentIndex}-${this.wordIndex}"]`,
    );

    if (!span || this._lastScrollTime + 2500 >= Date.now()) return;

    const scrollContainer = this.#scrollContainer();
    const containerRect = scrollContainer.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const relativeTop = spanRect.top - containerRect.top;
    const relativeBottom = spanRect.bottom - containerRect.top;
    const topBoundary = Math.min(containerRect.height * 0.25, 80);
    const bottomBoundary = containerRect.height - topBoundary;

    if (relativeTop >= topBoundary && relativeBottom <= bottomBoundary) return;

    const targetOffset = Math.min(containerRect.height * 0.12, 32);
    const targetScroll = this.#clampScrollTop(
      scrollContainer,
      scrollContainer.scrollTop + relativeTop - targetOffset,
    );
    this.#smoothScroll(scrollContainer, targetScroll);
  }

  #clampScrollTop(element: HTMLElement, scrollTop: number) {
    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
    return Math.min(maxScrollTop, Math.max(0, scrollTop));
  }

  #scrollContainer() {
    let element: HTMLElement | null = this;

    while (element) {
      if (this.#isScrollable(element)) return element;
      element = element.parentElement;
    }

    return this;
  }

  #isScrollable(element: HTMLElement) {
    const { overflowY } = window.getComputedStyle(element);
    return (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      element.scrollHeight > element.clientHeight
    );
  }

  private _segmentIndex: number;
  get segmentIndex(): number {
    return this._segmentIndex;
  }
  set segmentIndex(value: number) {
    if (this._segmentIndex != value) {
      this._segmentIndex = value;
      if (this.autoscroll) {
        this.#scrollActiveWordIntoView();
      }
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
      color: var(--mave-text-highlight-color, inherit);
      text-decoration-color: var(
        --mave-text-highlight-underline,
        var(--mave-text-highlight-outline, #8a5a00)
      );
      text-decoration-line: underline;
      text-decoration-skip-ink: auto;
      text-decoration-thickness: var(--mave-text-highlight-underline-thickness, 0.12em);
      text-underline-offset: var(--mave-text-highlight-underline-offset, 0.16em);
      -webkit-box-decoration-break: clone;
    }

    [data-highlight-position='start'] {
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
    }

    [data-highlight-position='middle'] {
      border-radius: 0;
    }

    [data-highlight-position='end'] {
      border-bottom-left-radius: 0;
      border-top-left-radius: 0;
    }

    [data-segment-id] {
      display: block;
      margin: 1em 0;
    }

    button[data-segment-id] {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
      line-height: inherit;
      padding: 0;
      text-align: inherit;
      white-space: normal;
      width: 100%;
    }

    button[data-segment-id]:focus-visible {
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
    this.rovingSegmentIndex = 0;
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
    this.#seekToSegment(
      event.currentTarget as HTMLElement | null,
      event instanceof MouseEvent ? this.#sentenceStartFromEvent(event) : undefined,
    );
  }

  #navigateSegments(event: KeyboardEvent) {
    if (!this.isInteractive()) return;

    const segmentCount = this.captions?.segments.length ?? 0;
    if (segmentCount === 0) return;

    const keyActions: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };

    let nextIndex: number | undefined;

    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = segmentCount - 1;
    } else if (event.key in keyActions) {
      const direction = keyActions[event.key];
      const currentIndex = this.#segmentIndexFromElement(event.currentTarget);
      const baseIndex = currentIndex ?? this.rovingSegmentIndex;
      nextIndex = (baseIndex + direction + segmentCount) % segmentCount;
    }

    if (nextIndex === undefined) return;

    event.preventDefault();
    this.rovingSegmentIndex = nextIndex;
    this.updateComplete.then(() => this.#focusSegment(nextIndex));
  }

  #seekToSegment(segment: HTMLElement | null, preferredStart?: number) {
    if (segment && this.player) {
      const segmentStart = Number(segment.getAttribute('x-caption-segment-start'));
      const time = preferredStart ?? segmentStart;

      if (!Number.isFinite(time)) return;

      this.player.currentTime = time;
      if (this.player.paused) {
        this.player.play();
      }
    }
  }

  #sentenceStartFromEvent(event: Event) {
    const wordElement = event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement && target.dataset.sentenceStart !== undefined,
      );
    const sentenceStart = Number(wordElement?.dataset.sentenceStart);

    return Number.isFinite(sentenceStart) ? sentenceStart : undefined;
  }

  private isInteractive() {
    return this.clickable && Boolean(this.player);
  }

  #focusSegment(segmentIndex: number) {
    this.shadowRoot
      ?.querySelector<HTMLButtonElement>(`button[data-segment-index="${segmentIndex}"]`)
      ?.focus();
  }

  #handleTranscriptFocusIn(event: FocusEvent) {
    this.transcriptHasFocus = true;
    const segmentIndex = this.#segmentIndexFromElement(event.target);
    if (segmentIndex !== undefined) {
      this.rovingSegmentIndex = segmentIndex;
    }
  }

  #handleTranscriptFocusOut(event: FocusEvent) {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !this.shadowRoot?.contains(nextTarget)) {
      this.transcriptHasFocus = false;
    }
  }

  #isInRange({ start, end }: { start: number; end: number }) {
    return this.currentTime >= start && this.currentTime <= end;
  }

  #normalizedHighlightMode() {
    return this.highlightMode === 'word' ? 'word' : 'sentence';
  }

  #wordEndsSentence(word: string) {
    return /[.!?][)"'\]\u2019\u201d]*$/.test(word.trim());
  }

  #activeSingleWordRange(segment: Caption['segments'][number]): ActiveWordRange | undefined {
    const activeWordIndex = segment.words.findIndex((word) => this.#isInRange(word));

    if (activeWordIndex < 0) return undefined;

    return {
      startIndex: activeWordIndex,
      endIndex: activeWordIndex,
    };
  }

  #sentenceWordRanges(segment: Caption['segments'][number]): SentenceWordRange[] {
    const { words } = segment;
    let sentenceStartIndex = 0;
    const sentenceWordRanges: SentenceWordRange[] = [];

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      const isSentenceEnd = this.#wordEndsSentence(word.word) || wordIndex === words.length - 1;

      if (!isSentenceEnd) continue;

      sentenceWordRanges.push({
        startIndex: sentenceStartIndex,
        endIndex: wordIndex,
        start: words[sentenceStartIndex].start,
        end: word.end,
        nextStart: words[wordIndex + 1]?.start,
      });

      sentenceStartIndex = wordIndex + 1;
    }

    return sentenceWordRanges;
  }

  #activeSentenceWordRange(
    segment: Caption['segments'][number],
    sentenceWordRanges: SentenceWordRange[],
  ): ActiveWordRange | undefined {
    const { words } = segment;

    for (const sentenceWordRange of sentenceWordRanges) {
      const { startIndex, endIndex, start, end, nextStart } = sentenceWordRange;

      if (this.currentTime >= start && this.currentTime <= end) {
        let activeWordIndex = startIndex;

        for (
          let candidateWordIndex = startIndex;
          candidateWordIndex <= endIndex;
          candidateWordIndex++
        ) {
          if (this.currentTime < words[candidateWordIndex].start) break;
          activeWordIndex = candidateWordIndex;
        }

        return {
          startIndex,
          endIndex: activeWordIndex,
        };
      }

      if (
        this.currentTime > end &&
        this.currentTime <= end + Text.SENTENCE_HIGHLIGHT_HOLD_SECONDS &&
        (nextStart === undefined || this.currentTime < nextStart)
      ) {
        return {
          startIndex,
          endIndex,
        };
      }
    }

    return undefined;
  }

  #sentenceWordRangeForWord(sentenceWordRanges: SentenceWordRange[], wordIndex: number) {
    return sentenceWordRanges.find(
      ({ startIndex, endIndex }) => wordIndex >= startIndex && wordIndex <= endIndex,
    );
  }

  #isWordHighlighted(activeWordRange: ActiveWordRange | undefined, wordIndex: number) {
    return (
      !!activeWordRange &&
      wordIndex >= activeWordRange.startIndex &&
      wordIndex <= activeWordRange.endIndex
    );
  }

  #highlightPosition(
    activeWordRange: ActiveWordRange | undefined,
    wordIndex: number,
  ): HighlightPosition | undefined {
    if (!this.#isWordHighlighted(activeWordRange, wordIndex)) return undefined;
    if (!activeWordRange || activeWordRange.startIndex === activeWordRange.endIndex) {
      return 'single';
    }

    if (wordIndex === activeWordRange.startIndex) return 'start';
    if (wordIndex === activeWordRange.endIndex) return 'end';

    return 'middle';
  }

  #shouldHighlightSeparator(activeWordRange: ActiveWordRange | undefined, wordIndex: number) {
    return (
      this.#normalizedHighlightMode() === 'sentence' &&
      !!activeWordRange &&
      wordIndex > activeWordRange.startIndex &&
      wordIndex <= activeWordRange.endIndex
    );
  }

  #activeSegmentIndex() {
    return this.captions?.segments.findIndex((segment) => this.#isInRange(segment)) ?? -1;
  }

  #segmentIndexFromElement(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return undefined;

    const segmentIndex = Number(target.dataset.segmentIndex);
    return Number.isNaN(segmentIndex) ? undefined : segmentIndex;
  }

  #segmentText(segment: Caption['segments'][number]) {
    return segment.text || segment.words.map((word) => word.word.trim()).join(' ');
  }

  #unit(value: number, singular: string, plural: string) {
    return `${value} ${value === 1 ? singular : plural}`;
  }

  #formatTimeLabel(time: number) {
    const totalSeconds = Math.max(0, Math.floor(time));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];

    if (hours > 0) parts.push(this.#unit(hours, 'hour', 'hours'));
    if (minutes > 0) parts.push(this.#unit(minutes, 'minute', 'minutes'));
    if (seconds > 0 || parts.length === 0) parts.push(this.#unit(seconds, 'second', 'seconds'));

    return parts.join(', ');
  }

  #segmentAriaLabel(segment: Caption['segments'][number]) {
    return `Jump to ${this.#formatTimeLabel(segment.start)}: ${this.#segmentText(segment)}`;
  }

  #transcriptLabel() {
    return this.getAttribute('aria-label') || this.transcriptLabel;
  }

  #segmentTabIndex(segmentIndex: number, activeSegmentIndex: number) {
    const tabbableSegmentIndex = this.transcriptHasFocus
      ? this.rovingSegmentIndex
      : activeSegmentIndex >= 0
        ? activeSegmentIndex
        : this.rovingSegmentIndex;

    return tabbableSegmentIndex === segmentIndex ? '0' : '-1';
  }

  #renderSegmentWords(segment: Caption['segments'][number], segmentIndex: number) {
    const sentenceWordRanges = this.#sentenceWordRanges(segment);
    const activeWordRange =
      this.#normalizedHighlightMode() === 'word'
        ? this.#activeSingleWordRange(segment)
        : this.#activeSentenceWordRange(segment, sentenceWordRanges);

    if (activeWordRange) {
      this.segmentIndex = segmentIndex;
      this.wordIndex = activeWordRange.endIndex;
    }

    return segment.words.map(
      (word, wordIndex) => {
        const isHighlighted = this.#isWordHighlighted(activeWordRange, wordIndex);
        const highlightPosition = this.#highlightPosition(activeWordRange, wordIndex);
        const highlightSeparator = this.#shouldHighlightSeparator(activeWordRange, wordIndex);
        const sentenceWordRange = this.#sentenceWordRangeForWord(sentenceWordRanges, wordIndex);
        const separatorSpan =
          wordIndex > 0
            ? html`<span
                data-highlight-position=${ifDefined(highlightSeparator ? 'middle' : undefined)}
                data-sentence-start=${ifDefined(sentenceWordRange?.start)}
                part=${ifDefined(highlightSeparator ? 'word' : undefined)}
                x-caption-sentence-start=${ifDefined(sentenceWordRange?.start)}
              >${' '}</span>`
            : nothing;

        const wordSpan = html`<span
          data-highlight-position=${ifDefined(highlightPosition)}
          data-sentence-start=${ifDefined(sentenceWordRange?.start)}
          data-word-id="word-${segmentIndex}-${wordIndex}"
          style=${styleMap(this.wordStyle(isHighlighted))}
          part=${ifDefined(isHighlighted ? 'word' : undefined)}
          x-caption-sentence-start=${ifDefined(sentenceWordRange?.start)}
          x-caption-word-start="${word.start}"
          x-caption-word-end="${word.end}"
        >${word.word.trim()}</span>`;

        return html`${separatorSpan}${wordSpan}`;
      },
    );
  }

  #renderSegment(
    segment: Caption['segments'][number],
    segmentIndex: number,
    activeSegmentIndex: number,
  ) {
    const isCurrentSegment = segmentIndex === activeSegmentIndex;
    const segmentPart = isCurrentSegment ? 'segment' : undefined;
    const ariaCurrent = isCurrentSegment ? 'time' : undefined;

    if (this.isInteractive()) {
      return html`
        <button
          type="button"
          data-segment-id="segment-${segmentIndex}"
          data-segment-index="${segmentIndex}"
          aria-current=${ifDefined(ariaCurrent)}
          aria-keyshortcuts="ArrowDown ArrowLeft ArrowRight ArrowUp End Home"
          aria-label=${this.#segmentAriaLabel(segment)}
          tabindex=${this.#segmentTabIndex(segmentIndex, activeSegmentIndex)}
          @click=${this.#jumpToSegment}
          @keydown=${this.#navigateSegments}
          part=${ifDefined(segmentPart)}
          x-caption-segment-start="${segment.start}"
          x-caption-segment-end="${segment.end}"
        >
          ${this.#renderSegmentWords(segment, segmentIndex)}
        </button>
      `;
    }

    return html`
      <p
        data-segment-id="segment-${segmentIndex}"
        data-segment-index="${segmentIndex}"
        aria-current=${ifDefined(ariaCurrent)}
        part=${ifDefined(segmentPart)}
        x-caption-segment-start="${segment.start}"
        x-caption-segment-end="${segment.end}"
      >
        ${this.#renderSegmentWords(segment, segmentIndex)}
      </p>
    `;
  }

  inRange(
    { start, end }: { start: number; end: number },
    part?: string,
    segmentIndex?: number,
    wordIndex?: number,
  ) {
    const withinValue = this.#isInRange({ start, end });
    if (withinValue) {
      if (segmentIndex !== undefined) this.segmentIndex = segmentIndex;
      if (wordIndex !== undefined) this.wordIndex = wordIndex;
      return part ? part : true;
    } else {
      return undefined;
    }
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
        const activeSegmentIndex = this.#activeSegmentIndex();

        return html`
          <div
            role="region"
            aria-label=${this.#transcriptLabel()}
            @focusin=${this.#handleTranscriptFocusIn}
            @focusout=${this.#handleTranscriptFocusOut}
          >
            ${this.captions.segments.map((segment, segmentIndex) =>
              this.#renderSegment(segment, segmentIndex, activeSegmentIndex),
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
