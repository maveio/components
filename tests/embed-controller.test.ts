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
