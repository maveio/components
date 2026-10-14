import type { ReactiveController, ReactiveControllerHost } from 'lit';

type StickyHost = HTMLElement &
  ReactiveControllerHost & {
    sticky?: string;
    sticky_mobile: boolean;
  };

/** Observe the original player footprint; the fixed surface never moves in the DOM. */
export class StickyPlayer implements ReactiveController {
  active = false;
  private dismissed = false;
  private visible = true;
  private playing = false;
  private nativeFullscreen = false;
  private pip = false;
  private observer?: IntersectionObserver;
  private media?: HTMLMediaElement;
  private events?: AbortController;
  private mobile?: MediaQueryList;
  private originalHeight = '';
  private originalHeightPriority = '';

  constructor(
    private host: StickyHost,
    private audio: () => boolean,
  ) {
    host.addController(this);
  }

  hostConnected() {
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    this.mobile = window.matchMedia('(max-width: 639px)');
    this.mobile.addEventListener('change', this.sync, options);
    document.addEventListener('fullscreenchange', this.sync, options);
    document.addEventListener('keydown', this.keydown, options);
  }

  hostUpdated() {
    if (!this.observer && typeof IntersectionObserver !== 'undefined') {
      const anchor = this.host.shadowRoot?.querySelector('[data-sticky-anchor]');
      if (anchor) {
        this.observer = new IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          this.sync();
        });
        this.observer.observe(anchor);
      }
    }
    const media = this.host.shadowRoot?.querySelector('video') ?? undefined;
    if (media !== this.media) {
      this.media = media;
      this.playing = false;
      this.pip = false;
      this.nativeFullscreen = false;
      const options = { signal: this.events?.signal };
      for (const name of [
        'playing',
        'pause',
        'ended',
        'emptied',
        'enterpictureinpicture',
        'leavepictureinpicture',
        'webkitbeginfullscreen',
        'webkitendfullscreen',
      ]) {
        media?.addEventListener(name, this.mediaEvent, options);
      }
    }
    this.sync();
  }

  private mediaEvent = (event: Event) => {
    if (event.target !== this.media) return;
    if (event.type === 'playing') this.playing = true;
    if (['pause', 'ended', 'emptied'].includes(event.type)) this.playing = false;
    if (event.type === 'enterpictureinpicture') this.pip = true;
    if (event.type === 'leavepictureinpicture') this.pip = false;
    if (event.type === 'webkitbeginfullscreen') this.nativeFullscreen = true;
    if (event.type === 'webkitendfullscreen') this.nativeFullscreen = false;
    this.sync();
  };

  private keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.active) this.dismiss();
  };

  dismiss = () => {
    this.dismissed = true;
    this.setActive(false);
  };

  reset() {
    this.playing = false;
    this.setActive(false);
  }

  private sync = () => {
    this.setActive(
      this.host.isConnected &&
        ['bottom-right', 'bottom-left'].includes(this.host.sticky ?? '') &&
        !this.audio() &&
        !this.dismissed &&
        !this.visible &&
        this.playing &&
        (!this.mobile?.matches || this.host.sticky_mobile) &&
        !document.fullscreenElement &&
        !document.pictureInPictureElement &&
        !this.nativeFullscreen &&
        !this.pip,
    );
  };

  private setActive(active: boolean) {
    if (this.active === active) return;
    if (active) {
      const rect = this.host.getBoundingClientRect();
      this.originalHeight = this.host.style.getPropertyValue('height');
      this.originalHeightPriority = this.host.style.getPropertyPriority('height');
      this.host.style.height = `${rect.height}px`;
      this.host.style.setProperty(
        '--mave-sticky-aspect',
        `${rect.width || 16} / ${rect.height || 9}`,
      );
    } else {
      this.host.style.setProperty(
        'height',
        this.originalHeight,
        this.originalHeightPriority,
      );
      this.host.style.removeProperty('--mave-sticky-aspect');
      const close = this.host.shadowRoot?.querySelector('[data-sticky-close]');
      if (
        close &&
        document.activeElement === this.host &&
        this.host.shadowRoot?.activeElement === close
      ) {
        // The close control disappears. Keep focus on the same player without scrolling.
        this.media?.setAttribute('tabindex', '-1');
        this.media?.focus({ preventScroll: true });
      }
    }
    this.active = active;
    this.host.toggleAttribute('data-sticky-active', active);
    this.host.requestUpdate();
  }

  hostDisconnected() {
    this.setActive(false);
    this.observer?.disconnect();
    this.observer = undefined;
    this.events?.abort();
    this.media = undefined;
  }
}
