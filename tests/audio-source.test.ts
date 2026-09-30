import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Metrics } from '@maveio/data';

import '../src/components/audio';
import { Config } from '../src/config';

vi.mock('../src/themes/loader', () => ({
  ThemeLoader: { get: vi.fn(async () => ({ name: 'source-test' })) },
}));
vi.mock('@lit-labs/observers/intersection-controller.js', () => ({
  IntersectionController: class {
    observe() {}
    unobserve() {}
  },
}));

const originalCdn = { ...Config.cdn };
const originalMetrics = { ...Config.metrics };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  Config.cdn.endpoint = 'https://cdn.example.test';
  Config.metrics.enabled = false;
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, originalCdn);
  Object.assign(Config.metrics, originalMetrics);
});

function mount(
  tag: 'mave-audio' | 'mave-player',
  filetype: 'mp3' | 'mp4',
  hasTrack = true,
) {
  fetchMock.mockImplementation(async (url) => {
    if (!String(url).includes('manifest.json')) {
      throw new Error(`Unexpected request: ${url}`);
    }
    return new Response(
      JSON.stringify({
        name: 'Source selection',
        settings: { controls: 'full', poster: null, loop: false },
        video: {
          filetype,
          audio: true,
          duration: 120,
          version: 1,
          status: 'ready',
          original: 'https://cdn.example.test/original.mp4',
          renditions:
            filetype === 'mp4' ? [{ container: 'hls', codec: 'h264', size: 'hd' }] : [],
        },
        audio_tracks: hasTrack
          ? [
              {
                filename: 'audio.mp3',
                path: '/audio.mp3',
                default: true,
                label: 'Audio',
                hls_src: 'https://cdn.example.test/audio.m3u8',
              },
            ]
          : [],
        subtitles: [],
      }),
    );
  });
  const player = document.createElement(tag);
  player.embed = 'aaaaabbbbbccccc';
  document.body.append(player);
  return player;
}

it('automatically renders audio-only uploads in mave-player', async () => {
  const player = mount('mave-player', 'mp3');
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('audio')?.src).toBe(
      'https://cdn.example.test/audio.mp3',
    ),
  );
  expect(player.shadowRoot?.querySelector('video')).toBeNull();
});

it('uses the direct audio track of a video and respects disabled analytics', async () => {
  const monitor = vi.spyOn(Metrics.prototype, 'monitor');
  const player = mount('mave-audio', 'mp4');
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('audio')?.src).toBe(
      'https://cdn.example.test/audio.mp3',
    ),
  );
  const audio = player.shadowRoot!.querySelector('audio')!;
  audio.dispatchEvent(new Event('play'));
  audio.dispatchEvent(new Event('playing'));
  audio.dispatchEvent(new Event('pause'));
  expect(monitor).not.toHaveBeenCalled();
  expect(player.shadowRoot?.querySelector('video')).toBeNull();
  expect(
    fetchMock.mock.calls.every(([url]) => String(url).includes('manifest.json')),
  ).toBe(true);
});

it('does not fall back to the video when no published audio track exists', async () => {
  const player = mount('mave-audio', 'mp4', false);
  await vi.waitFor(() =>
    expect(player.shadowRoot?.textContent).toContain('No audio track available'),
  );
  expect(player.shadowRoot?.querySelector('audio, video')).toBeNull();
});
