import { Config } from '../config';

export type PlaybackSource = {
  token: string;
  media_base_url: string;
};

export function playbackSource(token: string, embed: string): PlaybackSource {
  const endpoint = Config.cdn.playback_endpoint;
  const mediaBase =
    endpoint && !endpoint.startsWith('__MAVE_')
      ? endpoint
          .replace('${this.spaceId}', encodeURIComponent(embed.slice(0, 5)))
          .replace('${this.embedId}', encodeURIComponent(embed.slice(5)))
      : `${Config.api.endpoint.replace(/\/$/, '')}/playback/media/${encodeURIComponent(embed)}`;
  return {
    token,
    media_base_url: mediaBase,
  };
}
