import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as tus from 'tus-js-client';
import '../src/components/upload';
import Socket from '../src/embed/socket';

vi.mock('tus-js-client', () => ({
  Upload: vi.fn(
    class {
      findPreviousUploads = vi.fn(async () => []);
      resumeFromPreviousUpload = vi.fn();
      start = vi.fn();
    },
  ),
}));
vi.mock('../src/embed/socket', () => ({
  default: { connect: vi.fn(), disconnect: vi.fn() },
}));

let handlers: Record<string, (payload: any) => void>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(tus.Upload).mockClear();
  handlers = {};
  vi.mocked(Socket.connect).mockImplementation(
    (token) =>
      ({
        token,
        upload_id: 'upload-session',
        channel: {
          on: (name: string, callback: (payload: any) => void) => {
            handlers[name] = callback;
          },
          push: vi.fn(),
        },
      }) as unknown as ReturnType<typeof Socket.connect>,
  );
});
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

async function mount() {
  const upload = document.createElement('mave-upload');
  upload.token = 'upload-token';
  document.body.append(upload);
  await upload.updateComplete;
  return upload;
}

it('reports progress, processing and server completion, with playable emitted once', async () => {
  const upload = await mount();
  const progress = vi.fn();
  const completed = vi.fn();
  const playable = vi.fn();
  upload.addEventListener('progress', progress);
  upload.addEventListener('completed', completed);
  upload.addEventListener('playable', playable);
  upload.upload(new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
  await Promise.resolve();
  const options = vi.mocked(tus.Upload).mock.calls[0][1]!;
  options.onProgress!(5, 10);
  expect(upload.currentState).toBe('uploading');
  expect(progress.mock.calls[0][0].detail.progress).toBe(50);
  options.onSuccess!({} as never);
  expect(upload.currentState).toBe('processing');
  expect(completed).not.toHaveBeenCalled();
  handlers.completed({ embed: 'aaaaabbbbbccccc' });
  handlers.rendition({ container: 'hls', type: 'video' });
  handlers.rendition({ container: 'hls', type: 'video' });
  await vi.advanceTimersByTimeAsync(250);
  expect(upload.currentState).toBe('done');
  expect(completed.mock.calls[0][0].detail.embed).toBe('aaaaabbbbbccccc');
  expect(playable).toHaveBeenCalledOnce();
});

it('resumes a previous upload before starting and passes retry/session metadata to tus', async () => {
  const previous = { uploadUrl: 'https://upload.example.test/files/123' };
  vi.mocked(tus.Upload).mockImplementationOnce(function () {
    return {
      findPreviousUploads: vi.fn(async () => [previous]),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
    } as unknown as tus.Upload;
  });
  const upload = await mount();
  upload.upload(new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
  await Promise.resolve();
  const instance = vi.mocked(tus.Upload).mock.results[0].value;
  expect(instance.resumeFromPreviousUpload).toHaveBeenCalledWith(previous);
  expect(instance.resumeFromPreviousUpload.mock.invocationCallOrder[0]).toBeLessThan(
    instance.start.mock.invocationCallOrder[0],
  );
  const options = vi.mocked(tus.Upload).mock.calls[0][1]!;
  expect(options.retryDelays?.length).toBeGreaterThan(1);
  expect(options.metadata).toMatchObject({
    token: 'upload-token',
    upload_id: 'upload-session',
  });
});

it('exposes upload failures and can reset for another attempt', async () => {
  const upload = await mount();
  const failed = vi.fn();
  upload.addEventListener('failed', failed);
  upload.upload(new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
  vi.mocked(tus.Upload).mock.calls[0][1]!.onError!(new Error('Connection lost'));
  expect(upload.currentState).toBe('error');
  expect(failed.mock.calls[0][0].detail.message).toBe('Connection lost');
  upload.reset();
  expect(upload.currentState).toBe('initial');
});

it('rejects unsupported files without starting an upload', async () => {
  const upload = await mount();
  const input = upload.shadowRoot!.querySelector('input')!;
  Object.defineProperty(input, 'files', {
    value: [new File(['text'], 'notes.txt', { type: 'text/plain' })],
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  expect(upload.currentState).toBe('error');
  expect(tus.Upload).not.toHaveBeenCalled();
});
