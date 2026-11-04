import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Hls from 'hls.js';
import { LitElement, html } from 'lit';
import { MediaUIEvents } from 'media-chrome/dist/constants.js';
import type { MaveAudioTrackMenu } from '../src/components/audio-track-menu';
import '../src/components/player';
import { Config } from '../src/config';

// Playback behavior is tested with a minimal theme; real layouts are checked in a browser.
vi.mock('../src/themes/loader', () => ({
  ThemeLoader: { get: vi.fn(async () => ({ name: 'audio-description-test' })) },
}));

customElements.define(
  'theme-audio-description-test',
  class extends LitElement {
    render() {
      return html`<mave-audio-track-menu></mave-audio-track-menu>
        <mave-audio-track-menu-button></mave-audio-track-menu-button>`;
    }
  },
);

vi.mock('@lit-labs/observers/intersection-controller.js', () => ({
  IntersectionController: class {
    observe() {}
    unobserve() {}
  },
}));

const originalCdn = { ...Config.cdn };
const originalMetrics = { ...Config.metrics };
const tracks = [
  { id: 0, name: 'Original', lang: 'nl', default: true },
  {
    id: 1,
    name: 'English (audio description)',
    lang: 'en',
    characteristics: 'public.accessibility.describes-video',
  },
  {
    id: 2,
    name: 'Dutch (audio description)',
    lang: 'nl',
    characteristics: 'public.accessibility.describes-video',
  },
];
let selected = 0;

beforeEach(() => {
  selected = 0;
  // Happy DOM does not implement Element.part, which Media Chrome uses for menus.
  if (!('part' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'part', {
      configurable: true,
      get() {
        return {
          add: (...tokens: string[]) => {
            const current = this.getAttribute('part')?.split(' ') ?? [];
            this.setAttribute('part', [...new Set([...current, ...tokens])].join(' '));
          },
          remove: (...tokens: string[]) => {
            const current = this.getAttribute('part')?.split(' ') ?? [];
            this.setAttribute(
              'part',
              current.filter((token: string) => !tokens.includes(token)).join(' '),
            );
          },
        };
      },
    });
  }
  localStorage.clear();
  Config.cdn.endpoint = 'https://cdn.example.test';
  Config.metrics.enabled = false;
  vi.spyOn(Hls, 'isSupported').mockReturnValue(true);
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
  vi.spyOn(Hls.prototype, 'loadSource').mockImplementation(() => {});
  vi.spyOn(Hls.prototype, 'attachMedia').mockImplementation(() => {});
  vi.spyOn(Hls.prototype, 'audioTracks', 'get').mockReturnValue(tracks as never);
  vi.spyOn(Hls.prototype, 'audioTrack', 'get').mockImplementation(() => selected);
  vi.spyOn(Hls.prototype, 'audioTrack', 'set').mockImplementation((value) => {
    selected = value;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'Audio description test',
            settings: { controls: 'full', poster: null, loop: false },
            video: {
              filetype: 'mp4',
              audio: true,
              duration: 8,
              version: 1,
              status: 'ready',
              language: 'en',
              renditions: [{ container: 'hls', codec: 'h264', size: 'hd' }],
            },
            audio_tracks: [
              {
                filename: 'audio.mp3',
                path: '/audio.mp3',
                default: true,
                label: 'Original',
              },
            ],
            audio_descriptions: [
              {
                language: 'nl',
                label: 'Dutch description',
                audio: { path: '/ad.mp3' },
                vtt: { path: '/ad.vtt' },
              },
            ],
            subtitles: [],
          }),
        ),
    ),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, originalCdn);
  Object.assign(Config.metrics, originalMetrics);
});

async function mount() {
  const player = document.createElement('mave-player');
  player.embed = 'aaaaabbbbbccccc';
  document.body.append(player);
  let menu: MaveAudioTrackMenu;
  await vi.waitFor(() => {
    menu = player.shadowRoot
      ?.querySelector('theme-audio-description-test')
      ?.shadowRoot?.querySelector('mave-audio-track-menu') as MaveAudioTrackMenu;
    expect(menu?.tracks).toHaveLength(3);
  });
  return { player, menu: menu! };
}

it('lists description tracks in the audio menu and switches back to original audio', async () => {
  const { player, menu } = await mount();
  expect(menu.tracks.map((track) => track.label)).toEqual([
    'Original',
    'English (audio description)',
    'Dutch (audio description)',
  ]);
  for (const id of ['1', '2', '0']) {
    menu.dispatchEvent(
      new CustomEvent(MediaUIEvents.MEDIA_AUDIO_TRACK_REQUEST, {
        detail: id,
        bubbles: true,
        composed: true,
      }),
    );
    await vi.waitFor(() => expect(selected).toBe(Number(id)));
    expect(menu.selected).toBe(id);
  }
  expect(player.shadowRoot?.querySelector('track[kind="descriptions"]')).toBeTruthy();
  expect(menu.tracks).toHaveLength(3);
});

it('does not automatically enable descriptions from the removed AD toggle preference', async () => {
  localStorage.setItem('mave:audio-description', 'on');
  const { menu } = await mount();
  expect(selected).toBe(0);
  expect(menu.selected).toBe('0');
});
