import type { AudioTrack, Embed } from '../embed/api';

/** Identify audio uploads without mistaking a video's extracted tracks for audio-only media. */
export function isAudioOnlyEmbed(embed?: Embed): boolean {
  const video = embed?.video;
  if (!video || video.audio === false) return false;

  // These formats are audio-only even when an older encoder made a waveform video.
  const filetype = video.filetype?.trim().toLowerCase().replace(/^\./, '');
  if (
    [
      'mp3',
      'm4a',
      'm4b',
      'aac',
      'wav',
      'wave',
      'flac',
      'aif',
      'aiff',
      'oga',
      'opus',
      'wma',
    ].includes(filetype)
  )
    return true;

  // Containers such as MP4/OGG may hold either kind of media. Require inspected
  // empty dimensions, a published audio track and no video renditions. Missing
  // dimensions alone are not enough to classify an older/unfinished manifest.
  return (
    (video.max_width === 0 || video.max_width === null) &&
    (video.max_height === 0 || video.max_height === null) &&
    playableAudioTracks(embed).length > 0 &&
    !(video.renditions ?? []).some(
      (rendition) =>
        rendition.type === 'video' ||
        (!rendition.type && ['mp4', 'hls', 'webm'].includes(rendition.container)),
    )
  );
}

export function playableAudioTracks(embed?: Embed): AudioTrack[] {
  return (embed?.audio_tracks ?? []).filter((track) => !!track.path?.trim());
}

export function defaultAudioTrack(tracks: AudioTrack[]): AudioTrack | undefined {
  return tracks.find((track) => track.default) ?? tracks[0];
}

export function audioSourceURL(path: string, base: string, token?: string): string {
  const url = new URL(path, base);
  if (token && !url.searchParams.has('token')) url.searchParams.set('token', token);
  return url.href;
}

export function waveformPeaks(
  waveform: Embed['waveform'],
  duration: number,
): number[] | undefined {
  if (
    !waveform ||
    waveform.version !== 1 ||
    !Number.isFinite(waveform.duration) ||
    waveform.duration <= 0 ||
    Math.abs(waveform.duration - duration) > 1 ||
    !Array.isArray(waveform.peaks) ||
    waveform.peaks.length < 2 ||
    waveform.peaks.length > 4096 ||
    !waveform.peaks.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1)
  )
    return;

  // Group samples into visible bars without losing quiet passages or short peaks.
  const count = Math.min(128, waveform.peaks.length);
  return Array.from({ length: count }, (_, index) =>
    Math.max(
      ...waveform.peaks.slice(
        Math.floor((index * waveform.peaks.length) / count),
        Math.floor(((index + 1) * waveform.peaks.length) / count),
      ),
    ),
  );
}

/** Audio shares the player control tokens; artwork is always an explicit opt-in. */
export function audioControls(controls: string[]) {
  const none = controls.includes('none');
  const big = !none && controls.includes('big');
  const enabled = (control: string, inFull = true) =>
    !none &&
    !big &&
    (controls.includes(control) || (inFull && controls.includes('full')));
  return {
    play: big || enabled('play'),
    time: enabled('time'),
    seek: enabled('seek'),
    volume: enabled('volume'),
    subtitles: enabled('subtitles'),
    audiotracks: enabled('audiotracks'),
    rate: enabled('rate', false),
    airplay: enabled('airplay', false),
    thumbnail: !none && controls.includes('thumbnail'),
    big,
  };
}
