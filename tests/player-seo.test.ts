import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Hls from 'hls.js';
import '../src/components/player';
import { Config } from '../src/config';

vi.mock('../src/themes/loader', () => ({ ThemeLoader: { get: vi.fn(async () => ({ name: 'test' })) } }));
vi.mock('@lit-labs/observers/intersection-controller.js', () => ({
  IntersectionController: class { observe() {} unobserve() {} },
}));
const config = { cdn: { ...Config.cdn }, api: { ...Config.api }, metrics: { ...Config.metrics } };
const manifest = () => ({
  id: 'aaaaabbbbbccccc', name: 'A <script> & a video', description: 'Plain text', created_at: 1700000000,
  poster: { image_src: 'https://cdn.example.test/thumbnail.jpg' },
  settings: { controls: 'full', poster: null, loop: false },
  video: { filetype: 'mp4', audio: true, duration: 65.25, version: 1, status: 'ready',
    original: 'https://cdn.example.test/original.mp4', renditions: [{ container: 'mp4', codec: 'h264', size: 'hd' }] },
  subtitles: [],
});
beforeEach(() => {
  Config.cdn.endpoint = 'https://cdn.example.test/space-${this.spaceId}';
  Config.cdn.playback_endpoint = '';
  Config.api.endpoint = 'https://api.example.test/v1';
  Config.metrics.enabled = false;
  vi.spyOn(Hls, 'isSupported').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(manifest()))));
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  Object.assign(Config.cdn, config.cdn);
  Object.assign(Config.api, config.api);
  Object.assign(Config.metrics, config.metrics);
});
async function mount(attributes = '') {
  document.body.innerHTML = `<mave-player embed="aaaaabbbbbccccc" ${attributes}></mave-player>`;
  const player = document.querySelector('mave-player')!;
  await vi.waitFor(() => expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  await player.updateComplete;
  return player;
}
const scripts = () => document.querySelectorAll<HTMLScriptElement>('script[data-mave-seo]');
it('publishes one light-DOM VideoObject with ISO duration and cleans up', async () => {
  const player = await mount();
  await vi.waitFor(() => expect(scripts()).toHaveLength(1));
  expect(player.nextSibling).toBe(scripts()[0]);
  expect(JSON.parse(scripts()[0].textContent!)).toMatchObject({
    '@type': 'VideoObject', name: manifest().name, description: 'Plain text',
    duration: 'PT65.25S', uploadDate: '2023-11-14T22:13:20.000Z',
    embedUrl: 'https://cdn.example.test/space-aaaaa/bbbbbccccc/player.html',
    contentUrl: 'https://cdn.example.test/original.mp4',
  });
  expect(scripts()[0].textContent).not.toContain('<script>');
  player.requestUpdate();
  await player.updateComplete;
  expect(scripts()).toHaveLength(1);
  player.remove();
  expect(scripts()).toHaveLength(0);
});
it('honors seo=off and suppresses metadata immediately on token changes', async () => {
  const player = await mount('seo="off"');
  expect(scripts()).toHaveLength(0);
  player.removeAttribute('seo');
  await player.updateComplete;
  expect(scripts()).toHaveLength(1);
  player.token = 'private-token';
  expect(scripts()).toHaveLength(0);
  await player.updateComplete;
  expect(scripts()).toHaveLength(0);
});
it('never emits metadata from password-protected manifests', async () => {
  vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ ...manifest(), password_protected: true })));
  await mount();
  expect(scripts()).toHaveLength(0);
});
it('removes old metadata during embed changes and ignores stale public responses', async () => {
  const player = await mount();
  let respond!: (value: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { respond = resolve; }));
  player.embed = 'aaaaadddddeeeee';
  expect(scripts()).toHaveLength(0);
  await vi.waitFor(() => expect(respond).toBeTypeOf('function'));
  player.token = 'new-private-token';
  respond(new Response(JSON.stringify(manifest())));
  await player.updateComplete;
  expect(scripts()).toHaveLength(0);
});
it('omits signed content URLs and unavailable optional metadata', async () => {
  const data = { ...manifest(), description: undefined, created_at: 0 };
  data.video.original = 'https://cdn.example.test/original.mp4?X-Amz-Signature=hidden';
  vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify(data)));
  await mount();
  const json = JSON.parse(scripts()[0].textContent!);
  expect(json).not.toHaveProperty('contentUrl');
  expect(json).not.toHaveProperty('description');
  expect(json).not.toHaveProperty('uploadDate');
});
it('updates the existing script when public manifest metadata changes', async () => {
  const player = await mount();
  const script = scripts()[0];
  vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ ...manifest(), name: 'Updated title', description: undefined })));
  await (player as unknown as {embedController:{refresh:()=>Promise<unknown>}}).embedController.refresh();
  await vi.waitFor(() => expect(JSON.parse(script.textContent!).name).toBe('Updated title'));
  expect(scripts()).toHaveLength(1);
  expect(scripts()[0]).toBe(script);
  expect(JSON.parse(script.textContent!)).not.toHaveProperty('description');
});
