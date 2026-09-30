import { afterEach, expect, it, vi } from 'vitest';

import '../src/components/audio';
import { Config } from '../src/config';

const originalCdn = { ...Config.cdn };
const originalMetrics = { ...Config.metrics };

// Theme downloads are unrelated to the native media/analytics lifecycle.
vi.mock('../src/themes/loader', () => ({
  ThemeLoader: { get: vi.fn(async () => ({ name: 'metrics-test' })) },
}));

// There is no layout/intersection observation in this DOM test environment.
vi.mock('@lit-labs/observers/intersection-controller.js', () => ({
  IntersectionController: class {
    observe() {}
    unobserve() {}
  },
}));

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, originalCdn);
  Object.assign(Config.metrics, originalMetrics);
});

it('records audio started directly by the theme, without calling player.play()', async () => {
  const requests: { events: { name: string; component: string; embed_id: string }[] }[] =
    [];
  Config.cdn.endpoint = 'https://cdn.example.test';
  Config.metrics.endpoint = 'https://metrics.example.test/v1/events';
  Config.metrics.enabled = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      if (url === Config.metrics.endpoint) {
        requests.push(JSON.parse(String(options?.body)));
        return new Response('{}');
      }
      if (String(url).includes('manifest.json')) {
        return new Response(
          JSON.stringify({
            name: 'Audio analytics regression',
            settings: { controls: 'full', poster: null, loop: false },
            video: {
              filetype: 'mp3',
              audio: true,
              duration: 120,
              version: 1,
              status: 'ready',
              renditions: [],
            },
            audio_tracks: [
              {
                filename: 'audio.mp3',
                path: '/audio.mp3',
                default: true,
                label: 'Audio',
              },
            ],
            subtitles: [],
          }),
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    }),
  );

  const player = document.createElement('mave-audio');
  player.embed = 'aaaaabbbbbccccc';
  document.body.append(player);
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('audio')?.src).toContain('audio.mp3'),
  );
  const media = player.shadowRoot!.querySelector('audio')!;
  Object.defineProperties(media, {
    readyState: { value: 4, configurable: true },
    duration: { value: 120, configurable: true },
    currentTime: { value: 0, writable: true, configurable: true },
    paused: { value: false, writable: true, configurable: true },
  });

  vi.useFakeTimers();
  await vi.advanceTimersByTimeAsync(5000);
  expect(requests).toHaveLength(0);
  // Media Chrome starts the media element directly. Browsers dispatch play
  // before playing; analytics must be listening when playing arrives.
  media.dispatchEvent(new Event('play'));
  media.dispatchEvent(new Event('playing'));
  await vi.advanceTimersByTimeAsync(1500);
  media.currentTime = 2;
  Object.defineProperty(media, 'paused', { value: true, configurable: true });
  media.dispatchEvent(new Event('pause'));
  await vi.advanceTimersByTimeAsync(5000);

  expect(requests.flatMap((request) => request.events)).toMatchObject([
    { name: 'play', component: 'audio', embed_id: player.embed },
    { name: 'pause', component: 'audio', embed_id: player.embed },
  ]);

  // Calling the public API as well must not attach duplicate metrics listeners.
  vi.spyOn(media, 'play').mockResolvedValue();
  await player.play();
  Object.defineProperty(media, 'paused', { value: false, configurable: true });
  media.dispatchEvent(new Event('play'));
  media.dispatchEvent(new Event('playing'));
  await vi.advanceTimersByTimeAsync(1500);
  media.currentTime = 4;
  Object.defineProperty(media, 'paused', { value: true, configurable: true });
  media.dispatchEvent(new Event('pause'));
  await vi.advanceTimersByTimeAsync(5000);
  expect(
    requests.flatMap((request) => request.events.map((event) => event.name)),
  ).toEqual(['play', 'pause', 'play', 'pause']);
});
