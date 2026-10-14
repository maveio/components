import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Hls from 'hls.js';
import '../src/components/player';
import '../src/components/audio';
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

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status});
function passwordServer() {
  return vi.mocked(fetch).mockImplementation(async (url) => {
    const path=String(url);
    if (path.includes('/access')) return json({password_protected:true});
    if (path.includes('/password-token')) return json({token:'internal-password-token',expires_at:9999999999});
    if (path.includes('token=')) return json(manifest());
    return json({},403);
  });
}
async function mount(tag='mave-player', attrs='') {
  document.body.innerHTML=`<${tag} embed="aaaaabbbbbccccc" ${attrs}></${tag}>`;
  return document.querySelector('mave-player, mave-audio')! as import('../src/components/player').Player;
}
async function form(player: import('../src/components/player').Player) {
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('form')).not.toBeNull());
  return player.shadowRoot!.querySelector('form')!;
}
function submit(form: HTMLFormElement) {
  form.querySelector('input')!.value='test password';
  form.dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true}));
}
it('makes no access request for ordinary public playback', async()=>{
  const player=await mount();
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  expect(vi.mocked(fetch).mock.calls.filter(([url])=>String(url).includes('/access'))).toHaveLength(0);
});
it('unlocks a static-style player and keeps its token only in memory',async()=>{
  passwordServer(); const player=await mount(); const f=await form(player);
  expect(f.querySelector('label')?.htmlFor).toBe('playback-password');
  submit(f);
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/playback/media/aaaaabbbbbccccc/manifest.json?token=internal-password-token'))).toBe(true);
  expect(player.token).toBeUndefined(); expect(player.getAttribute('token')).toBeNull();
  expect(document.documentElement.outerHTML).not.toContain('internal-password-token');
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  expect(document.querySelector('script[data-mave-seo]')).toBeNull();
});
it('shows localized validation and loading state, prevents duplicate submissions, and can retry',async()=>{
  const server=passwordServer(); let resolve!: (response:Response)=>void;
  server.mockImplementation(async(url)=>{
    if(String(url).includes('/access')) return json({password_protected:true});
    if(String(url).includes('/password-token')) return new Promise<Response>(r=>{resolve=r;});
    return json({},403);
  });
  const player=await mount(); const f=await form(player); submit(f); f.dispatchEvent(new SubmitEvent('submit',{cancelable:true}));
  await player.updateComplete;
  expect(f.getAttribute('aria-busy')).toBe('true'); expect(f.querySelector('button')?.disabled).toBe(true);
  expect(server.mock.calls.filter(([url])=>String(url).includes('/password-token'))).toHaveLength(1);
  resolve(json({error:'invalid_password'},401));
  await vi.waitFor(()=>expect(f.querySelector('[role="alert"]')?.textContent).toContain('Incorrect password'));
  expect(f.querySelector('input')?.value).toBe('');
  await vi.waitFor(()=>expect(player.shadowRoot?.activeElement).toBe(f.querySelector('input')));
  submit(f); resolve(json({error:'rate_limited'},429));
  await vi.waitFor(()=>expect(f.textContent).toContain('Too many attempts'));
});
it('explicit tokens take precedence and never request a password access signal',async()=>{
  passwordServer(); const player=await mount('mave-player','token="explicit-token"');
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  expect(vi.mocked(fetch).mock.calls.every(([url])=>!String(url).includes('/access'))).toBe(true);
});
it('discards late authorization after switching embeds and resets the internal token',async()=>{
  const server=passwordServer(); let resolve!: (response:Response)=>void;
  server.mockImplementation(async(url)=>{
    if(String(url).includes('/access')) return json({password_protected:true});
    if(String(url).includes('/password-token')) return new Promise<Response>(r=>{resolve=r;});
    return json({},403);
  });
  const player=await mount(); submit(await form(player));
  player.embed='aaaaadddddeeeee'; resolve(json({token:'stale-token'}));
  await form(player); await player.updateComplete;
  expect(server.mock.calls.every(([url])=>!String(url).includes('stale-token'))).toBe(true);
});
it('ignores delayed access discovery when an explicit token arrives',async()=>{
  let resolve!: (response:Response)=>void;
  vi.mocked(fetch).mockImplementation(async(url)=>{
    if(String(url).includes('/access')) return new Promise<Response>(r=>{resolve=r;});
    if(String(url).includes('token=')) return json(manifest());
    return json({},403);
  });
  const player=await mount(); await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));
  player.token='explicit-token'; resolve(json({password_protected:true}));
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  expect(player.shadowRoot?.querySelector('form')).toBeNull();
});
it('offers the same password form through the audio subclass',async()=>{
  passwordServer(); const player=await mount('mave-audio'); expect(await form(player)).toBeTruthy();
});
it('clears successful internal authorization on embed changes and disconnect',async()=>{
  const server=passwordServer(); const player=await mount(); submit(await form(player));
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  server.mockClear(); player.embed='aaaaadddddeeeee';
  await form(player);
  expect(server.mock.calls.every(([url])=>!String(url).includes('internal-password-token'))).toBe(true);
  player.remove(); document.body.append(player);
  await form(player);
  expect(player.getAttribute('token')).toBeNull();
  expect(document.querySelector('script[data-mave-seo]')).toBeNull();
});
it('does not apply a pending password token after the caller supplies an explicit token',async()=>{
  let resolve!: (response:Response)=>void;
  vi.mocked(fetch).mockImplementation(async(url)=>{
    if(String(url).includes('/access')) return json({password_protected:true});
    if(String(url).includes('/password-token')) return new Promise<Response>(r=>{resolve=r;});
    if(String(url).includes('token=explicit')) return json({...manifest(),password_protected:true});
    return json({},403);
  });
  const player=await mount(); submit(await form(player)); player.token='explicit';
  resolve(json({token:'late-internal'}));
  await vi.waitFor(()=>expect(player.shadowRoot?.querySelector('video')).not.toBeNull());
  expect(vi.mocked(fetch).mock.calls.every(([url])=>!String(url).includes('late-internal'))).toBe(true);
});
it('keeps explicit locales independent when multiple players share a page',async()=>{
  passwordServer();
  document.body.innerHTML='<mave-player embed="aaaaabbbbbccccc" locale="nl"></mave-player><mave-player embed="aaaaadddddeeeee" locale="en"></mave-player>';
  const players=document.querySelectorAll('mave-player');
  const dutch=await form(players[0]), english=await form(players[1]);
  expect(dutch.querySelector('label')?.textContent).toContain('Voer het videowachtwoord in');
  expect(english.querySelector('label')?.textContent).toContain('Enter the video password');
});
it('explains pending storage protection without treating it as a bad password',async()=>{
  vi.mocked(fetch).mockImplementation(async(url)=>{
    if(String(url).includes('/access')) return json({password_protected:true});
    if(String(url).includes('/password-token')) return json({error:'protection_pending'},409);
    return json({},403);
  });
  const player=await mount(); const f=await form(player); submit(f);
  await vi.waitFor(()=>expect(f.textContent).toContain('protection is still being applied'));
});
