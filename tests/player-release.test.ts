import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Hls from 'hls.js';
import '../src/components/player';
import { Config } from '../src/config';

vi.mock('../src/themes/loader', () => ({
  ThemeLoader: { get: vi.fn(async () => ({ name: 'player-test' })) },
}));
vi.mock('@lit-labs/observers/intersection-controller.js', () => ({
  IntersectionController: class {
    observe() {}
    unobserve() {}
  },
}));

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const EMBED = 'aaaaabbbbbccccc';
const originalCdn = { ...Config.cdn };
const originalApi = { ...Config.api };
const originalMetrics = { ...Config.metrics };

let released = false;
let releaseAt = NOW / 1000 + 65;
let serverSkew = 0;
let fallbackManifest: () => unknown;

const readyManifest = () => ({
  id: EMBED,
  name: 'Launch',
  settings: { controls: 'full', poster: null, loop: false },
  video: {
    id: 'video-1',
    filetype: 'mp4',
    audio: true,
    duration: 120,
    version: 1,
    status: 'ready',
    renditions: [{ container: 'mp4', codec: 'h264', size: 'hd', type: 'video' }],
  },
  audio_tracks: [],
  subtitles: [],
});

const scheduledManifest = () => ({
  id: EMBED,
  name: 'Launch',
  release_at: releaseAt,
  server_time: Math.floor(Date.now() / 1000) + serverSkew,
  settings: { controls: 'full', poster: null, loop: false, color: '#ff4d00' },
  poster: { renditions: [], image_src: null, initial_frame_src: null },
  video: {
    id: 'bbbbbccccc',
    filetype: 'mp4',
    version: 1,
    status: 'scheduled',
    ready: false,
    renditions: [],
    sources: [],
    src: null,
  },
  audio_tracks: [],
  subtitles: [],
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  released = false;
  releaseAt = NOW / 1000 + 65;
  serverSkew = 0;
  fallbackManifest = scheduledManifest;
  Config.cdn.endpoint = 'https://cdn.example.test';
  Config.api.endpoint = 'https://api.example.test/api/v1';
  Config.cdn.playback_endpoint = '';
  Config.metrics.enabled = false;
  // Worst-case jitter keeps the timing assertions deterministic.
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
  vi.spyOn(Hls, 'isSupported').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/manifest.json')) {
        return released
          ? new Response(JSON.stringify(readyManifest()))
          : new Response('Access Denied', { status: 403 });
      }
      if (url.startsWith(`${Config.api.endpoint}/${EMBED}`)) {
        return new Response(
          JSON.stringify(released ? readyManifest() : fallbackManifest()),
        );
      }
      return new Response('Not found', { status: 404 });
    }),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, originalCdn);
  Object.assign(Config.api, originalApi);
  Object.assign(Config.metrics, originalMetrics);
});

function mount() {
  const player = document.createElement('mave-player');
  player.embed = EMBED;
  document.body.append(player);
  return player;
}

const values = (player: HTMLElement) =>
  [...(player.shadowRoot?.querySelectorAll('.release__value') ?? [])].map(
    (node) => node.textContent,
  );

const fetchedUrls = () => vi.mocked(fetch).mock.calls.map(([url]) => String(url));

it('counts down without requesting media and starts playback once released', async () => {
  const player = mount();

  await vi.waitFor(() => expect(values(player)).toEqual(['00', '01', '05']));
  expect(
    player.shadowRoot?.querySelector('[role="timer"]')?.getAttribute('aria-label'),
  ).toMatch(/^available on /);
  expect(player.shadowRoot?.querySelector('video')).toBeNull();
  expect(fetchedUrls()).toContain(`${Config.api.endpoint}/${EMBED}`);
  await expect(player.play()).rejects.toThrow('not released yet');

  await vi.advanceTimersByTimeAsync(5_000);
  expect(values(player)).toEqual(['00', '01', '00']);

  released = true;
  await vi.advanceTimersByTimeAsync(60_000 + 3_100);

  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('video')).not.toBeNull(),
  );
  expect(player.shadowRoot?.querySelector('.release')).toBeNull();
  expect(player.shadowRoot?.querySelector('video')?.getAttribute('src') ?? '').toContain(
    'h264_hd.mp4',
  );
  expect(fetchedUrls().some((url) => /storyboard|subtitle|h264/.test(url))).toBe(false);
});

it('keeps waiting after the release time until the server publishes the video', async () => {
  releaseAt = NOW / 1000 - 1;
  const player = mount();

  await vi.waitFor(() =>
    expect(
      player.shadowRoot?.querySelector('.release .processing-state__text')?.textContent,
    ).toBe('available soon'),
  );

  await vi.advanceTimersByTimeAsync(3_100);
  await vi.advanceTimersByTimeAsync(8_100);
  const manifestRequests = fetchedUrls().filter((url) => url.includes('manifest.json'));
  expect(manifestRequests.length).toBeGreaterThanOrEqual(3);
  expect(player.shadowRoot?.querySelector('video')).toBeNull();

  released = true;
  await vi.advanceTimersByTimeAsync(30_000);
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('video')).not.toBeNull(),
  );
});

it('uses the server clock and shows days for distant releases', async () => {
  serverSkew = 30;
  releaseAt = NOW / 1000 + serverSkew + 2 * 86_400 + 3 * 3_600 + 60;
  const player = mount();

  await vi.waitFor(() => expect(values(player)).toEqual(['02', '03', '01', '00']));
  expect(player.shadowRoot?.querySelector('.release__date')?.textContent).toBeTruthy();
});

it('resumes the countdown after the element is moved in the DOM', async () => {
  releaseAt = NOW / 1000 + 3_600;
  const player = mount();
  await vi.waitFor(() => expect(values(player)).toEqual(['01', '00', '00']));

  // The server clock has whole-second precision, so allow one second of rounding.
  await vi.advanceTimersByTimeAsync(600_000);
  expect(values(player).slice(0, 2)).toEqual(['00', '50']);
  expect(['00', '01']).toContain(values(player)[2]);

  player.remove();
  await vi.advanceTimersByTimeAsync(10_000);
  document.body.append(player);
  await vi.advanceTimersByTimeAsync(5_000);
  expect(values(player).slice(0, 2)).toEqual(['00', '49']);
  expect(['45', '46']).toContain(values(player)[2]);
});

it('picks up an earlier release while viewers are waiting and starts playback', async () => {
  releaseAt = NOW / 1000 + 86_400;
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  const player = mount();
  await vi.waitFor(() => expect(values(player)).toHaveLength(4));
  expect(play).not.toHaveBeenCalled();

  released = true;
  await vi.advanceTimersByTimeAsync(360_000);

  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('video')).not.toBeNull(),
  );
  await vi.waitFor(() => expect(play).toHaveBeenCalled());
});

it('backs off while the release is still converging', async () => {
  releaseAt = NOW / 1000 - 1;
  mount();
  await vi.advanceTimersByTimeAsync(600_000);

  const manifestRequests = fetchedUrls().filter((url) => url.includes('manifest.json'));
  expect(manifestRequests.length).toBeGreaterThan(5);
  expect(manifestRequests.length).toBeLessThan(20);
});

it('does not use an API manifest that is neither scheduled nor published', async () => {
  fallbackManifest = () => ({
    ...readyManifest(),
    video: { ...readyManifest().video, status: 'preparing' },
  });
  const player = mount();

  await vi.advanceTimersByTimeAsync(10_000);
  await vi.waitFor(() =>
    expect(player.shadowRoot?.textContent).toContain('unable to load this video'),
  );
  expect(player.shadowRoot?.querySelector('video')).toBeNull();
});
