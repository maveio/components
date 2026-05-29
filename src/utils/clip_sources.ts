import type { Poster, Rendition } from '../embed/api';

export type ClipCodec = Extract<Rendition['codec'], 'av1' | 'hevc' | 'h264'>;
export type ClipSize = Rendition['size'];
export type ClipAutoplay = 'always' | 'off' | 'true' | 'scroll' | 'lazy' | undefined;

export interface ClipSource {
  codec: ClipCodec;
  rendition: Rendition;
  src: string;
  type: string;
}

export interface ClipSourceOptions {
  autoplay?: ClipAutoplay;
  devicePixelRatio?: number;
  playableCodecs?: readonly ClipCodec[];
  preferredCodecs?: readonly ClipCodec[];
  quality?: string;
  renderedLongEdge?: number;
  toSrc?: (file: string, rendition: Rendition) => string;
}

export interface ClipPosterOptions {
  explicitPoster?: string | null;
  fallback?: 'placeholder' | 'thumbnail';
  poster?: {
    image_src?: string | null;
    initial_frame_src?: string | null;
    renditions?: readonly Poster[] | null;
    type?: string | null;
    video_src?: string | null;
  } | null;
  preferredContainers?: readonly Poster['container'][];
  toSrc?: (file: string) => string;
}

export const CLIP_CODECS = ['av1', 'hevc', 'h264'] as const;
export const CLIP_SIZE_ORDER = ['sd', 'hd', 'fhd', 'qhd', 'uhd'] as const;

export const CLIP_SIZE_LONG_EDGE: Record<ClipSize, number> = {
  sd: 640,
  hd: 1280,
  fhd: 1920,
  qhd: 2560,
  uhd: 3840,
};

const AUTO_QUALITY_MAX_SIZE: ClipSize = 'qhd';
const FALLBACK_CODEC: ClipCodec = 'h264';
const MODERN_CODECS = new Set<ClipCodec>(['av1', 'hevc']);
const DEFAULT_PREFERRED_CODECS: readonly ClipCodec[] = ['av1', 'hevc', 'h264'];

const CLIP_CODEC_STRINGS: Record<ClipCodec, string> = {
  av1: 'av01.0.08M.08.0.110.01.01.01.0',
  hevc: 'hvc1.1.6.L123.B0',
  h264: 'avc1.640028',
};

export function clipMimeType(codec: ClipCodec): string {
  return `video/mp4; codecs="${CLIP_CODEC_STRINGS[codec]}"`;
}

export function detectPlayableClipCodecs(
  video?: Pick<HTMLVideoElement, 'canPlayType'>,
): ClipCodec[] {
  if (!video) return [...DEFAULT_PREFERRED_CODECS];

  const playableCodecs = CLIP_CODECS.filter(
    (codec) => video.canPlayType(clipMimeType(codec)) !== '',
  );

  if (!playableCodecs.includes(FALLBACK_CODEC)) {
    playableCodecs.push(FALLBACK_CODEC);
  }

  return playableCodecs;
}

export function clipRenditionFile(rendition: Rendition): string {
  const suffix = rendition.type && rendition.type !== 'video' ? `_${rendition.type}` : '';
  return `${rendition.codec}_${rendition.size}${suffix}.mp4`;
}

export function selectClipPosterSource(
  options: ClipPosterOptions = {},
): string | undefined {
  if (options.explicitPoster) return options.explicitPoster;

  const posterRenditions = options.poster?.renditions;
  const posterRendition = Array.isArray(posterRenditions)
    ? bestPosterRendition(posterRenditions, options.preferredContainers)
    : undefined;
  const toSrc = options.toSrc ?? ((file: string) => file);

  if (posterRendition) return toSrc(`poster.${posterRendition.container}`);
  if (options.poster?.initial_frame_src) return options.poster.initial_frame_src;

  return toSrc(`${options.fallback ?? 'placeholder'}.jpg`);
}

export function clipSizeForRenderedLongEdge(
  renderedLongEdge = 0,
  devicePixelRatio = 1,
  quality = 'auto',
): ClipSize {
  const explicitSize = explicitSizeForQuality(quality);
  if (explicitSize) return explicitSize;

  const requiredLongEdge = Math.max(
    0,
    Math.ceil(renderedLongEdge * Math.max(devicePixelRatio || 1, 1)),
  );

  const targetSize =
    CLIP_SIZE_ORDER.find((size) => CLIP_SIZE_LONG_EDGE[size] >= requiredLongEdge) ??
    CLIP_SIZE_ORDER[CLIP_SIZE_ORDER.length - 1];

  return lowerSize(targetSize, AUTO_QUALITY_MAX_SIZE);
}

export function selectClipSources(
  renditions: readonly Rendition[],
  options: ClipSourceOptions = {},
): ClipSource[] {
  const targetSize = clipSizeForRenderedLongEdge(
    options.renderedLongEdge,
    options.devicePixelRatio,
    options.quality,
  );
  const explicitSize = explicitSizeForQuality(options.quality);
  const playableCodecs = new Set(options.playableCodecs ?? DEFAULT_PREFERRED_CODECS);
  const preferredCodecs = options.preferredCodecs ?? DEFAULT_PREFERRED_CODECS;
  const renditionTypes = allowedRenditionTypes(options.autoplay);
  const toSrc = options.toSrc ?? ((file: string) => file);

  const compatibleRenditions = renditions.filter(
    (rendition): rendition is Rendition & { codec: ClipCodec } =>
      rendition.container === 'mp4' &&
      isClipCodec(rendition.codec) &&
      sizeIndex(rendition.size) <= sizeIndex(explicitSize ?? AUTO_QUALITY_MAX_SIZE) &&
      (!rendition.type || renditionTypes.includes(rendition.type)),
  );

  const selectedRenditions: Rendition[] = [];

  for (const codec of preferredCodecs) {
    if (!MODERN_CODECS.has(codec) || !playableCodecs.has(codec)) continue;

    const rendition = bestRenditionForCodec(
      compatibleRenditions,
      codec,
      targetSize,
      renditionTypes,
    );
    if (rendition) selectedRenditions.push(rendition);
  }

  const fallbackRendition = bestRenditionForCodec(
    compatibleRenditions,
    FALLBACK_CODEC,
    targetSize,
    renditionTypes,
  );
  if (fallbackRendition) selectedRenditions.push(fallbackRendition);

  return uniqueRenditions(selectedRenditions).map((rendition) => {
    const codec = rendition.codec as ClipCodec;
    const file = clipRenditionFile(rendition);

    return {
      codec,
      rendition,
      src: toSrc(file, rendition),
      type: clipMimeType(codec),
    };
  });
}

function allowedRenditionTypes(autoplay: ClipAutoplay): Rendition['type'][] {
  return autoplay === 'scroll' ? ['clip_keyframes'] : ['clip', 'video'];
}

function bestPosterRendition(
  renditions: readonly Poster[],
  preferredContainers: readonly Poster['container'][] = ['avif', 'webp', 'jpg'],
): Poster | undefined {
  return preferredContainers
    .map((container) =>
      renditions.find(
        (rendition) => rendition.type === 'poster' && rendition.container === container,
      ),
    )
    .find((rendition): rendition is Poster => !!rendition);
}

function bestRenditionForCodec(
  renditions: readonly Rendition[],
  codec: ClipCodec,
  targetSize: ClipSize,
  typePreference: readonly Rendition['type'][],
): Rendition | undefined {
  const codecRenditions = renditions.filter((rendition) => rendition.codec === codec);
  if (!codecRenditions.length) return undefined;

  return [...codecRenditions].sort((a, b) => {
    const sizeDiff = sizeFitIndex(a.size, targetSize) - sizeFitIndex(b.size, targetSize);
    if (sizeDiff !== 0) return sizeDiff;

    return typeIndex(a.type, typePreference) - typeIndex(b.type, typePreference);
  })[0];
}

function isClipCodec(codec: Rendition['codec']): codec is ClipCodec {
  return (CLIP_CODECS as readonly Rendition['codec'][]).includes(codec);
}

function lowerSize(size: ClipSize, maxSize: ClipSize): ClipSize {
  return sizeIndex(size) <= sizeIndex(maxSize) ? size : maxSize;
}

function explicitSizeForQuality(quality: string | undefined): ClipSize | undefined {
  if (!quality || quality === 'auto') return undefined;
  if ((CLIP_SIZE_ORDER as readonly string[]).includes(quality))
    return quality as ClipSize;
  return undefined;
}

function sizeIndex(size: ClipSize): number {
  return CLIP_SIZE_ORDER.indexOf(size);
}

function sizeFitIndex(size: ClipSize, targetSize: ClipSize): number {
  const index = sizeIndex(size);
  const targetIndex = sizeIndex(targetSize);

  if (index <= targetIndex) {
    return targetIndex - index;
  }

  return 100 + index - targetIndex;
}

function typeIndex(
  type: Rendition['type'] | undefined,
  typePreference: readonly Rendition['type'][],
): number {
  if (!type) return typePreference.length;

  const index = typePreference.indexOf(type);
  return index === -1 ? typePreference.length : index;
}

function uniqueRenditions(renditions: readonly Rendition[]): Rendition[] {
  const seen = new Set<string>();
  const unique: Rendition[] = [];

  for (const rendition of renditions) {
    const key = clipRenditionFile(rendition);
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(rendition);
  }

  return unique;
}
