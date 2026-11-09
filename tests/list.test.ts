import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import '../src/components/img';
import '../src/components/list';
import { List } from '../src/components/list';
import { Config } from '../src/config';

const originalApi = { ...Config.api };
const originalCdn = { ...Config.cdn };

beforeEach(() => {
  Config.api.endpoint = 'https://api.example.test/api/v1';
  Config.cdn.endpoint = 'https://space-${this.spaceId}.example.test';
  Config.cdn.playback_endpoint =
    'https://space-${this.spaceId}.signed.example.test/${this.embedId}';
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            videos: [
              { id: 'aaaaabbbbbccccc', name: 'Example video', duration: 8, created: 1 },
            ],
            collections: [],
          }),
        ),
    ),
  );
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  Object.assign(Config.api, originalApi);
  Object.assign(Config.cdn, originalCdn);
});

async function mount(attributes = '', template = '<mave-img></mave-img>') {
  document.body.innerHTML = `<mave-list token="collection-jwt" ${attributes}>
    <template>${template}</template>
  </mave-list>`;
  const list = document.querySelector('mave-list') as List;
  await vi.waitFor(() => expect(list.shadowRoot?.querySelector('mave-img')).toBeTruthy());
  return list;
}

function image(list: List) {
  return list.shadowRoot!.querySelector('mave-img')!;
}

it('uses the collection token only for listing, leaving posters public', async () => {
  const list = await mount();
  expect(fetch).toHaveBeenCalledWith(
    'https://api.example.test/api/v1/collection/collection-jwt',
  );
  expect(image(list).token).toBeUndefined();
  expect(image(list).poster).toBe(
    'https://space-aaaaa.example.test/bbbbbccccc/thumbnail.jpg',
  );
});

it('preserves an explicit token on a nested image without replacing it with the list token', async () => {
  const list = await mount('', '<mave-img token="image-jwt"></mave-img>');
  expect(image(list).token).toBe('image-jwt');
  expect(image(list).poster).toBe(
    'https://space-aaaaa.signed.example.test/bbbbbccccc/thumbnail.jpg?token=image-jwt',
  );
});

it('keeps public images when the collection token changes', async () => {
  const list = await mount();
  list.setAttribute('token', 'refreshed-collection-jwt');
  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/collection/refreshed-collection-jwt',
    ),
  );
  await vi.waitFor(() => expect(image(list)?.embed).toBe('aaaaabbbbbccccc'));
  expect(image(list).token).toBeUndefined();
  expect(image(list).poster).toBe(
    'https://space-aaaaa.example.test/bbbbbccccc/thumbnail.jpg',
  );
});
