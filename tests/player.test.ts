import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Hls from 'hls.js';
import { Metrics } from '@maveio/data';
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

const originalCdn = { ...Config.cdn };
const originalApi = { ...Config.api };
const originalMetrics = { ...Config.metrics };
let filetype = 'mp4';

beforeEach(() => {
  filetype = 'mp4';
  Config.cdn.endpoint = 'https://cdn.example.test';
  Config.api.endpoint = 'https://api.example.test/api/v1';
  Config.cdn.playback_endpoint = '';
  Config.metrics.enabled = false;
  vi.spyOn(Hls, 'isSupported').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'Playback',
            settings: { controls: 'full', poster: null, loop: false },
            video: {
              filetype,
              audio: true,
              duration: 120,
              version: 1,
              status: 'ready',
              renditions:
                filetype === 'mp4'
                  ? [
                      { container: 'hls', codec: 'h264', size: 'hd' },
                      { container: 'mp4', codec: 'h264', size: 'hd' },
                    ]
                  : [],
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
        ),
    ),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, originalCdn);
  Object.assign(Config.api, originalApi);
  Object.assign(Config.metrics, originalMetrics);
});

async function mount() {
  const player = document.createElement('mave-player');
  player.embed = 'aaaaabbbbbccccc';
  document.body.append(player);
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('video')).not.toBeNull(),
  );
  return player;
}

it('plays private media with an HTML token attribute and accepts a refreshed token', async () => {
  document.body.innerHTML =
    '<mave-player embed="aaaaabbbbbccccc" token="viewer-jwt"></mave-player>';
  const player = document.querySelector('mave-player')!;
  await vi.waitFor(() => {
    expect(player.shadowRoot?.querySelector('video')?.src).toContain(
      `${Config.api.endpoint}/playback/media/aaaaabbbbbccccc/`,
    );
  });
  expect(player.token).toBe('viewer-jwt');
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('token=viewer-jwt'),
    undefined,
  );
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes('/playback/sessions')),
  ).toBe(false);

  player.setAttribute('token', 'refreshed-jwt');
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('token=refreshed-jwt'),
      undefined,
    );
  });
});

it('falls back to MP4 without HLS support and forwards play/pause to the media', async () => {
  const player = await mount();
  const media = player.shadowRoot!.querySelector('video')!;
  expect(media.src).toContain('h264_hd.mp4');
  const play = vi.spyOn(media, 'play').mockResolvedValue();
  const pause = vi.spyOn(media, 'pause').mockImplementation(() => {});
  await player.play();
  player.pause();
  expect(play).toHaveBeenCalledOnce();
  expect(pause).toHaveBeenCalledOnce();
});

it('uses the configured space media host for private playback', async () => {
  Config.cdn.playback_endpoint =
    'https://space-${this.spaceId}.signed.example.test/${this.embedId}';
  const player = document.createElement('mave-player');
  player.embed = 'aaaaabbbbbccccc';
  player.token = 'viewer-jwt';
  document.body.append(player);
  await vi.waitFor(() => {
    expect(player.shadowRoot?.querySelector('video')?.src).toContain(
      'https://space-aaaaa.signed.example.test/bbbbbccccc/',
    );
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining(
      'https://space-aaaaa.signed.example.test/bbbbbccccc/manifest.json?token=viewer-jwt',
    ),
    undefined,
  );
});

it('uses native HLS on Safari instead of creating a JavaScript HLS player', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Version/18.0 Safari/605.1');
  vi.mocked(Hls.isSupported).mockReturnValue(true);
  vi.mocked(HTMLMediaElement.prototype.canPlayType).mockReturnValue('probably');
  const load = vi.spyOn(Hls.prototype, 'loadSource');
  const player = await mount();
  expect(player.shadowRoot!.querySelector('video')!.src).toContain('playlist.m3u8');
  expect(load).not.toHaveBeenCalled();
});

it('attaches HLS.js when needed and destroys it when the embed changes', async () => {
  vi.mocked(Hls.isSupported).mockReturnValue(true);
  const load = vi.spyOn(Hls.prototype, 'loadSource').mockImplementation(() => {});
  const attach = vi.spyOn(Hls.prototype, 'attachMedia').mockImplementation(() => {});
  const destroy = vi.spyOn(Hls.prototype, 'destroy');
  const player = await mount();
  expect(load).toHaveBeenCalledWith(expect.stringContaining('playlist.m3u8'));
  expect(attach).toHaveBeenCalledWith(player.shadowRoot!.querySelector('video'));
  const oldInstance = load.mock.instances[0];
  player.embed = 'aaaaadddddeeeee';
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  expect(destroy.mock.instances).toContain(oldInstance);
  expect(load.mock.calls[1][0]).toContain('dddddeeeee');
});

it('switches a video embed to audio and detaches the old analytics session', async () => {
  Config.metrics.enabled = true;
  const monitor = vi.spyOn(Metrics.prototype, 'monitor').mockReturnThis();
  const demonitor = vi.spyOn(Metrics.prototype, 'demonitor');
  const player = await mount();
  const oldMedia = player.shadowRoot!.querySelector('video')!;
  vi.spyOn(oldMedia, 'play').mockResolvedValue();
  await player.play();
  const oldSession = monitor.mock.instances[0];
  filetype = 'mp3';
  player.embed = 'aaaaadddddeeeee';
  await vi.waitFor(() =>
    expect(player.shadowRoot?.querySelector('audio')?.src).toBe(
      'https://cdn.example.test/audio.mp3',
    ),
  );
  expect(player.shadowRoot!.querySelector('video')).toBeNull();
  expect(demonitor.mock.instances).toContain(oldSession);
  const audio = player.shadowRoot!.querySelector('audio')!;
  vi.spyOn(audio, 'play').mockResolvedValue();
  await player.play();
  expect(monitor.mock.instances[monitor.mock.instances.length - 1]).not.toBe(oldSession);
});
