import { LitElement } from 'lit';
import { afterEach, expect, it, vi } from 'vitest';

import { Config } from '../src/config';
import { EmbedController, EmbedType } from '../src/embed/controller';

class CollectionHost extends LitElement {
  controller = new EmbedController(this, EmbedType.Collection);
}

customElements.define('test-collection-host', CollectionHost);

const originalApi = { ...Config.api };

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  Object.assign(Config.api, originalApi);
});

it('keeps collection tokens in the existing URL for root and nested requests', async () => {
  Config.api.endpoint = 'https://api.example.test/api/v1';
  const fetch = vi.fn(async () =>
    new Response(JSON.stringify({ videos: [], collections: [] })),
  );
  vi.stubGlobal('fetch', fetch);

  const host = new CollectionHost();
  host.controller.token = 'collection-jwt';
  document.body.append(host);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(
    'https://api.example.test/api/v1/collection/collection-jwt',
  ));

  host.controller.embed = 'aaaaabbbbbccccc';
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(
    'https://api.example.test/api/v1/collection/collection-jwt?embed=aaaaabbbbbccccc',
  ));
});

class VideoHost extends LitElement {
  controller = new EmbedController(this, EmbedType.Embed);
}
customElements.define('test-video-host', VideoHost);
it('ignores an old A response after A → B → A, including its media version', async () => {
  const original = Config.cdn.endpoint;
  Config.cdn.endpoint = 'https://cdn.example.test';
  let oldA!: (response: Response) => void;
  let count = 0;
  vi.stubGlobal('fetch', vi.fn(async () => {
    count++;
    if (count === 1) return new Promise<Response>(resolve => {oldA = resolve;});
    return new Response(JSON.stringify({video:{version:2}}));
  }));
  const host = new VideoHost(); host.controller.embed='aaaaabbbbbccccc'; document.body.append(host);
  await vi.waitFor(() => expect(oldA).toBeTypeOf('function'));
  host.controller.embed='aaaaadddddeeeee';
  await vi.waitFor(() => expect(count).toBe(2));
  host.controller.embed='aaaaabbbbbccccc';
  await vi.waitFor(() => expect(count).toBe(3));
  expect(host.controller.version).toBe('/v2/');
  const oldResponse = new Response(JSON.stringify({video:{version:1}}));
  const parsed = vi.spyOn(oldResponse, 'json');
  oldA(oldResponse);
  await vi.waitFor(() => expect(parsed).toHaveBeenCalled());
  await host.updateComplete;
  expect(host.controller.version).toBe('/v2/');
  expect(host.controller.publicManifest).toBe(true);
  Config.cdn.endpoint = original;
});
