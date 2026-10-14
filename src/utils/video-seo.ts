import type { Embed } from '../embed/api';

function publicUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      return;
    if (
      [...url.searchParams.keys()].some((key) =>
        /token|signature|credential|x-amz-/i.test(key),
      )
    )
      return;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Build metadata only from a manifest already fetched through public playback. */
export function videoObject(embed: Embed, playerUrl: string, contentUrl?: string) {
  if (embed.password_protected || (embed.visibility && embed.visibility !== 'public'))
    return;
  const thumbnail = publicUrl(embed.poster?.image_src || embed.poster?.initial_frame_src);
  const embedUrl = publicUrl(playerUrl);
  if (!embed.name || !thumbnail || !embedUrl) return;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: embed.name,
    thumbnailUrl: thumbnail,
    embedUrl,
  };
  if (embed.description) data.description = embed.description;
  if (Number.isFinite(embed.created_at) && embed.created_at > 0) {
    const date = new Date(embed.created_at * 1000);
    if (!Number.isNaN(date.getTime())) data.uploadDate = date.toISOString();
  }
  if (Number.isFinite(embed.video?.duration) && embed.video.duration > 0) {
    data.duration = `PT${Number(embed.video.duration.toFixed(3))}S`;
  }
  const content = publicUrl(contentUrl);
  if (content) data.contentUrl = content;
  return data;
}

export class VideoSeo {
  private script?: HTMLScriptElement;

  update(host: HTMLElement, data?: Record<string, unknown>) {
    if (!host.isConnected || !data) return this.clear();
    this.script ??= document.createElement('script');
    this.script.type = 'application/ld+json';
    this.script.dataset.maveSeo = '';
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    if (this.script.textContent !== json) this.script.textContent = json;
    if (host.nextSibling !== this.script) host.after(this.script);
  }

  clear() {
    this.script?.remove();
    this.script = undefined;
  }
}
