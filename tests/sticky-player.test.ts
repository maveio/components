import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StickyPlayer } from '../src/utils/sticky-player';

const observers: { callback: IntersectionObserverCallback; target?: Element; disconnect: ReturnType<typeof vi.fn> }[] = [];
let mobile: EventTarget & { matches: boolean };
function mount(side = 'bottom-right', allowMobile = false) {
  const host = document.createElement('div') as HTMLDivElement & {
    sticky: string; sticky_mobile: boolean; addController: () => void; requestUpdate: () => void;
  };
  Object.assign(host, {sticky: side, sticky_mobile: allowMobile, addController: vi.fn(), requestUpdate: vi.fn()});
  host.attachShadow({mode:'open'}).innerHTML = '<div data-sticky-anchor></div><video tabindex="0"></video><button data-sticky-close>Close</button>';
  host.style.height = 'auto';
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({width:640,height:360} as DOMRect);
  document.body.append(host);
  const controller = new StickyPlayer(host, () => false);
  controller.hostConnected(); controller.hostUpdated();
  const observer = observers.at(-1)!;
  const video = host.shadowRoot!.querySelector('video')!;
  const visibility = (visible: boolean) => observer.callback([{isIntersecting:visible} as IntersectionObserverEntry], {} as IntersectionObserver);
  return {host, controller, video, visibility, observer};
}
beforeEach(() => {
  observers.length = 0;
  mobile = Object.assign(new EventTarget(), {matches:false});
  vi.stubGlobal('matchMedia', () => mobile);
  vi.stubGlobal('IntersectionObserver', class {
    item: typeof observers[number];
    constructor(callback: IntersectionObserverCallback) { this.item={callback,disconnect:vi.fn()}; observers.push(this.item); }
    observe(target: Element) { this.item.target=target; }
    disconnect() { this.item.disconnect(); }
  });
});
afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });
it('observes a separate fixed anchor, floats only while playing offscreen and preserves space', () => {
  const p=mount();
  expect(p.observer.target?.hasAttribute('data-sticky-anchor')).toBe(true);
  p.visibility(false); expect(p.controller.active).toBe(false);
  p.video.dispatchEvent(new Event('playing')); expect(p.controller.active).toBe(true);
  expect(p.host.style.height).toBe('360px');
  expect(p.video.parentNode).toBe(p.host.shadowRoot);
  p.visibility(true); expect(p.controller.active).toBe(false);
  expect(p.host.style.height).toBe('auto');
  p.visibility(false); expect(p.controller.active).toBe(true);
  p.video.dispatchEvent(new Event('pause')); expect(p.controller.active).toBe(false);
  p.controller.hostDisconnected(); expect(p.observer.disconnect).toHaveBeenCalled();
});
it('requires sticky-mobile below 640px and responds to viewport changes', () => {
  const p=mount(); mobile.matches=true;
  p.video.dispatchEvent(new Event('playing')); p.visibility(false);
  expect(p.controller.active).toBe(false);
  p.host.sticky_mobile=true; p.controller.hostUpdated(); expect(p.controller.active).toBe(true);
  p.host.sticky_mobile=false; p.controller.hostUpdated(); expect(p.controller.active).toBe(false);
  mobile.matches=false; mobile.dispatchEvent(new Event('change')); expect(p.controller.active).toBe(true);
  p.controller.hostDisconnected();
});
it('dismisses only this player in memory and preserves focus when close disappears', () => {
  const a=mount(), b=mount('bottom-left');
  for (const p of [a,b]) { p.visibility(false); p.video.dispatchEvent(new Event('playing')); }
  a.host.shadowRoot!.querySelector<HTMLButtonElement>('button')!.focus();
  a.controller.dismiss();
  expect(a.host.shadowRoot!.activeElement).toBe(a.video);
  expect(b.controller.active).toBe(true);
  a.visibility(true); a.visibility(false); a.controller.reset(); a.video.dispatchEvent(new Event('playing'));
  expect(a.controller.active).toBe(false);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); expect(b.controller.active).toBe(false);
  a.controller.hostDisconnected(); b.controller.hostDisconnected();
});
it('leaves floating mode for fullscreen, picture-in-picture, media replacement and disconnect', () => {
  const p=mount(); p.visibility(false); p.video.dispatchEvent(new Event('playing'));
  for (const [enter,leave] of [['webkitbeginfullscreen','webkitendfullscreen'],['enterpictureinpicture','leavepictureinpicture']]) {
    p.video.dispatchEvent(new Event(enter)); expect(p.controller.active).toBe(false);
    p.video.dispatchEvent(new Event(leave)); expect(p.controller.active).toBe(true);
  }
  p.controller.reset(); expect(p.controller.active).toBe(false);
  p.video.dispatchEvent(new Event('playing')); expect(p.controller.active).toBe(true);
  p.controller.hostDisconnected(); expect(p.controller.active).toBe(false);
  expect(p.host.style.height).toBe('auto');
});
it('stays disabled without a supported sticky value', () => {
  const p=mount('off'); p.visibility(false); p.video.dispatchEvent(new Event('playing'));
  expect(p.controller.active).toBe(false); p.controller.hostDisconnected();
});
