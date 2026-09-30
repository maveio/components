import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { css, html, LitElement } from 'lit';
import 'media-chrome/dist/media-controller.js';
import type MediaController from 'media-chrome/dist/media-controller.js';
import { MediaUIEvents } from 'media-chrome/dist/constants.js';
import { build as buildDefault } from '../src/themes/default';
import { build as buildDolphin } from '../src/themes/dolphin';
import { build as buildSynthwave } from '../src/themes/synthwave';

// Exercise the real theme templates and Media Chrome controller/store. Visual
// controls stay unregistered: Happy DOM does not implement their styling APIs.
// These tests cover client-side cookies and Web Storage, not HTTP Set-Cookie.
beforeAll(() => {
  buildDefault('storage-default', LitElement, html, css);
  buildDolphin('storage-dolphin', LitElement, html, css);
  buildSynthwave('storage-synthwave', LitElement, html, css);
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});

afterEach(() => {
  document.body.replaceChildren();
});

it.each([
  ['default', 'video'],
  ['dolphin', 'video'],
  ['synthwave', 'video'],
  ['default', 'audio'],
  ['dolphin', 'audio'],
  ['synthwave', 'audio'],
])(
  '%s %s does not write cookies or Web Storage during loading and control use',
  async (name, kind) => {
    // Catch attempted writes even if a dependency catches errors or removes keys.
    const localWrites = vi.spyOn(localStorage, 'setItem');
    const sessionWrites = vi.spyOn(sessionStorage, 'setItem');
    const cookieWrites = vi.spyOn(Document.prototype, 'cookie', 'set');
    const theme = document.createElement(`theme-storage-${name}`) as LitElement;
    if (kind === 'audio') theme.setAttribute('audio', '');
    const media = document.createElement(kind) as HTMLMediaElement;
    // Happy DOM's RemotePlayback stub does not return the browser's Promise.
    vi.spyOn(media.remote, 'cancelWatchAvailability').mockResolvedValue();
    media.slot = 'media';
    const track = media.addTextTrack('subtitles', 'Dutch', 'nl');
    track.mode = 'disabled';
    theme.append(media);
    document.body.append(theme);
    await theme.updateComplete;
    const controller = theme.shadowRoot!.querySelector(
      'media-controller',
    ) as MediaController;
    await vi.waitFor(() => expect(controller.media).toBe(media));
    await vi.waitFor(() => expect(controller.mediaStore.getState().mediaVolume).toBe(1));

    const request = (type: string, detail?: unknown) =>
      controller.dispatchEvent(
        new CustomEvent(type, { detail, bubbles: true, composed: true }),
      );
    request(MediaUIEvents.MEDIA_MUTE_REQUEST);
    await vi.waitFor(() => expect(media.muted).toBe(true));
    request(MediaUIEvents.MEDIA_UNMUTE_REQUEST);
    await vi.waitFor(() => expect(media.muted).toBe(false));
    request(MediaUIEvents.MEDIA_VOLUME_REQUEST, 0.4);
    await vi.waitFor(() => expect(media.volume).toBe(0.4));
    const subtitles = [{ kind: 'subtitles', label: 'Dutch', language: 'nl' }];
    request(MediaUIEvents.MEDIA_SHOW_SUBTITLES_REQUEST, subtitles);
    await vi.waitFor(() => expect(track.mode).toBe('showing'));
    request(MediaUIEvents.MEDIA_DISABLE_SUBTITLES_REQUEST, subtitles);
    await vi.waitFor(() => expect(track.mode).toBe('disabled'));

    theme.remove();
    expect(localWrites).not.toHaveBeenCalled();
    expect(sessionWrites).not.toHaveBeenCalled();
    expect(cookieWrites).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  },
);
