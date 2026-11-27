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

async function mount(template = '<mave-img></mave-img>', more = '') {
  document.body.innerHTML = `<mave-list token="collection-jwt">
    <template>${template}</template>
    ${more}
  </mave-list>`;
  const list = document.querySelector('mave-list') as List;
  await vi.waitFor(() => expect(list.shadowRoot?.querySelector('mave-img')).toBeTruthy());
  return list;
}

const moreControl = '<button type="button" slot="more-link" class="custom">More</button>';
const moreBlock = `<div name="mave-list-more">${moreControl}</div>`;

function moreButton(list: List) {
  return list.shadowRoot!.querySelector<HTMLButtonElement>('button[slot="more-link"]');
}

function image(list: List) {
  return list.shadowRoot!.querySelector('mave-img')!;
}

it('uses the collection token only for listing, leaving posters public', async () => {
  const list = await mount();
  expect(fetch).toHaveBeenCalledWith(
    'https://api.example.test/api/v1/collection/collection-jwt?page=1&per_page=25&order=newest&compact=true',
  );
  expect(image(list).token).toBeUndefined();
  expect(image(list).poster).toBe(
    'https://space-aaaaa.example.test/bbbbbccccc/thumbnail.jpg',
  );
});

it('preserves an explicit token on a nested image without replacing it with the list token', async () => {
  const list = await mount('<mave-img token="image-jwt"></mave-img>');
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
      'https://api.example.test/api/v1/collection/refreshed-collection-jwt?page=1&per_page=25&order=newest&compact=true',
    ),
  );
  await vi.waitFor(() => expect(image(list)?.embed).toBe('aaaaabbbbbccccc'));
  expect(image(list).token).toBeUndefined();
  expect(image(list).poster).toBe(
    'https://space-aaaaa.example.test/bbbbbccccc/thumbnail.jpg',
  );
});

it('renders a load more control only when supplied in the list markup', async () => {
  const video = { id: 'aaaaabbbbbccccc', name: 'Example', duration: 8, created: 1 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        videos: [video],
        collections: [],
        current_page: 1,
        has_more: true,
      }),
    ),
  );

  const list = await mount();
  expect(moreButton(list)).toBeNull();

  const withControl = await mount(undefined, moreBlock);
  expect(moreButton(withControl)?.textContent).toBe('More');
  expect(moreButton(withControl)?.className).toBe('custom');
});

it('keeps loaded videos in place when retrying and appending the next page', async () => {
  const firstVideo = { id: 'aaaaabbbbbccccc', name: 'First', duration: 8, created: 2 };
  const secondVideo = { id: 'aaaaadddddeeeee', name: 'Second', duration: 8, created: 1 };
  const results = [
    Response.json({
      videos: [firstVideo],
      collections: [],
      current_page: 1,
      has_more: true,
    }),
    new Response(null, { status: 504 }),
    Response.json({
      videos: [secondVideo],
      collections: [],
      current_page: 2,
      has_more: false,
    }),
  ];
  const fetch = vi.fn(async (_url: string) => results.shift()!);
  vi.stubGlobal('fetch', fetch);

  const list = await mount(
    undefined,
    `<template name="mave-list-more">${moreControl}</template>`,
  );
  const firstImage = image(list);
  const button = moreButton(list)!;

  button.click();
  await vi.waitFor(() =>
    expect(button.closest('[part="pagination"]')?.getAttribute('data-state')).toBe(
      'error',
    ),
  );
  expect(moreButton(list)).toBe(button);
  expect(image(list)).toBe(firstImage);
  button.click();

  await vi.waitFor(() =>
    expect(list.shadowRoot!.querySelectorAll('mave-img')).toHaveLength(2),
  );
  expect(image(list)).toBe(firstImage);
  expect(moreButton(list)).toBeNull();
  expect(list.getNextForEmbed(firstVideo.id)).toEqual(secondVideo);
  expect(
    fetch.mock.calls.slice(1).map(([url]) => new URL(url).searchParams.get('page')),
  ).toEqual(['2', '2']);
});

it('discards an in-flight next page when the order changes', async () => {
  const video = { id: 'aaaaabbbbbccccc', name: 'Example', duration: 8, created: 1 };
  let finishNextPage: (response: Response) => void;
  const nextPage = new Promise<Response>((resolve) => (finishNextPage = resolve));
  const fetch = vi.fn(async (url: string) => {
    const params = new URL(url).searchParams;
    if (params.get('page') === '2') return nextPage;
    return Response.json({
      videos: [
        params.get('order') === 'az' ? { ...video, id: 'aaaaafffffggggg' } : video,
      ],
      collections: [],
      current_page: 1,
      has_more: true,
    });
  });
  vi.stubGlobal('fetch', fetch);

  const list = await mount(undefined, moreBlock);
  moreButton(list)!.click();
  list.order = 'az';
  await vi.waitFor(() => expect(image(list)?.embed).toBe('aaaaafffffggggg'));
  finishNextPage!(
    Response.json({ videos: [video], collections: [], current_page: 2, has_more: false }),
  );
  await nextPage;
  await list.updateComplete;
  expect(list.containsEmbed(video.id)).toBe(false);
});
