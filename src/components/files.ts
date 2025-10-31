import { css, html } from 'lit';
import { property } from 'lit/decorators.js';

import { Embed, Rendition } from '../embed/api';
import { EmbedController } from '../embed/controller';
import { MaveElement } from '../utils/mave_element';

export class Files extends MaveElement {
  @property({ type: String })
  get embed(): string {
    return this._embed;
  }

  set embed(value: string) {
    if (this._embed !== value) {
      this._embed = value;
      this.requestUpdate('embed');
      this.embedController.embed = this.embed;
    }
  }

  get _slottedChildren() {
    const slot = this.shadowRoot?.querySelector('slot');
    return slot?.assignedElements({ flatten: true }) || [];
  }

  private embedController = new EmbedController(this);
  private _data: Embed;

  static styles = css`
    :host {
      display: block;
      --link-color: #006fc6;
      --link-decoration: underline;
      --link-decoration-thickness: 1px;
      --link-decoration-offset: 1px;
      --link-cursor: pointer;
    }

    a {
      text-decoration: var(--link-decoration);
      text-decoration-thickness: var(--link-decoration-thickness);
      text-underline-offset: var(--link-decoration-thickness);
      color: var(--link-color);
      cursor: var(--link-cursor);
    }
  `;

  render() {
    return html`
      ${this.embedController.render({
        pending: this.renderPending,
        complete: (data) => {
          this._data = data as Embed;
          if (!data) return;

          const primaryVideoRendition = this.#getPrimaryVideoRendition();
          const primaryAudioRendition = this.#getPrimaryAudioRendition();

          const templates = this._slottedChildren.map((item: any) => {
            function createClone() {
              let clone: DocumentFragment;
              if (item.nodeName === 'TEMPLATE') {
                clone = (item as HTMLTemplateElement).content.cloneNode(
                  true,
                ) as DocumentFragment;
              } else {
                clone = item.cloneNode(true) as DocumentFragment;
              }
              return clone;
            }

            if (item.getAttribute('name') == 'mave-files-video') {
              if (!primaryVideoRendition) return;
              const template = createClone();

              // created_at
              const createdAtValue = Number(this._data.created_at);
              const createdAtTimestamp =
                createdAtValue && createdAtValue < 1_000_000_000_000
                  ? createdAtValue * 1000
                  : createdAtValue;
              if (Number.isFinite(createdAtTimestamp))
                this.#setTextContent(
                  template,
                  'date',
                  new Date(createdAtTimestamp).toLocaleDateString().replaceAll('/', '-'),
                );

              // duration
              const duration = this._data.video.duration;
              if (duration)
                this.#setTextContent(template, 'duration', this.durationToTime(duration));

              // format
              const filetype = this._data.video.filetype;
              if (filetype) this.#setTextContent(template, 'filetype', filetype);

              // size
              const videoSizeBytes =
                primaryVideoRendition.file_size || this._data.video.size;

              if (videoSizeBytes)
                this.#setTextContent(
                  template,
                  'size',
                  this.#formatMegabytes(videoSizeBytes),
                );

              // download
              const downloadUrl = this.#buildVideoDownloadUrl(primaryVideoRendition);
              const downloadExtension = primaryVideoRendition.container || 'mp4';
              const link = this.#createDownloadLink(
                downloadUrl,
                `${this._data.name}.${downloadExtension}`,
              );
              link.setAttribute('aria-label', 'Download video');
              link.appendChild(template);

              return html`${link}`;
            }

            if (
              primaryAudioRendition &&
              this._data.video.audio &&
              item.getAttribute('name') == 'mave-files-audio'
            ) {
              const template = createClone();

              const audioFiletype = primaryAudioRendition.container || 'mp3';
              this.#setTextContent(template, 'filetype', audioFiletype);

              const audioSizeBytes = primaryAudioRendition.file_size;
              if (audioSizeBytes)
                this.#setTextContent(
                  template,
                  'size',
                  this.#formatMegabytes(audioSizeBytes),
                );

              // download
              const audioUrl = this.#buildAudioDownloadUrl(primaryAudioRendition);
              const link = this.#createDownloadLink(
                audioUrl,
                `${this._data.name}.${audioFiletype}`,
              );
              link.setAttribute('aria-label', 'Download audio');
              link.appendChild(template);

              return html`${link}`;
            }

            const subtitle = this._data.subtitles.find(
              (l) => l.language == this._data.video.language,
            );

            if (subtitle && item.getAttribute('name') == 'mave-files-subtitles') {
              const template = createClone();

              this.#setTextContent(template, 'filetype', 'vtt');

              // download
              const link = this.#createDownloadLink(
                subtitle.path,
                `${this._data.name}.vtt`,
              );
              link.setAttribute('aria-label', 'Download subtitles');
              link.appendChild(template);

              return html`${link}`;
            }
          });

          return html`${this._stylesheets} ${templates}`;
        },
      })}
    `;
  }

  renderPending() {
    return html`<slot style="display: none"></slot>`;
  }

  #setTextContent(template: DocumentFragment, slotName: string, text: string) {
    const element = template.querySelector(
      `[slot="${slotName}"], [data-slot="${slotName}"]`,
    ) as Element | null;
    if (!element) return;
    element.textContent = text;
    element.removeAttribute('slot');
    element.removeAttribute('data-slot');
  }

  #downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    this.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    this.removeChild(a);
  }

  #fetchAndDownloadFile(url: string, filename: string): Promise<void> {
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then((blob) => this.#downloadBlob(blob, filename))
      .catch((e) => console.error('Something went wrong:', e));
  }

  #createDownloadLink(url: string, filename: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.classList.add('link');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.setAttribute('target', 'new');

    let isDownloading = false;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (isDownloading) return;
      isDownloading = true;

      link.style.cursor = 'wait';
      link.style.opacity = '0.5';

      this.#fetchAndDownloadFile(url, filename).then(() => {
        isDownloading = false;

        link.style.cursor = 'pointer';
        link.style.opacity = '1';
      });
    });

    return link;
  }

  #formatMegabytes(bytes: number): string {
    const megabytes = bytes / 1_000_000;
    if (megabytes < 10) return `${megabytes.toFixed(1)} MB`;
    const hasFraction = megabytes % 1 !== 0;
    return `${megabytes.toFixed(hasFraction ? 1 : 0)} MB`;
  }

  #buildAssetUrl(filename: string): string {
    const versionSegment =
      this._data?.video?.version && this._data.video.version > 0
        ? `v${this._data.video.version}/`
        : '';
    return `${this.cdn_root}/${this.embedId}/${versionSegment}${filename}`;
  }

  #buildVideoDownloadUrl(rendition?: Rendition): string {
    const codec = rendition?.codec || 'h264';
    const size = rendition?.size || 'hd';
    const container = rendition?.container || 'mp4';
    return this.#buildAssetUrl(`${codec}_${size}.${container}`);
  }

  #buildAudioDownloadUrl(rendition?: Rendition): string {
    const extension = rendition?.container || 'mp3';
    return this.#buildAssetUrl(`audio.${extension}`);
  }

  #getPrimaryVideoRendition(): Rendition | undefined {
    const renditions = (this._data?.video?.renditions || []) as Rendition[];
    if (!renditions.length) return undefined;

    const mp4Renditions = renditions.filter(
      (rendition) =>
        rendition.container === 'mp4' &&
        rendition.codec === 'h264' &&
        (!rendition.type || rendition.type === 'video'),
    );

    const preferredOrder: Rendition['size'][] = ['hd', 'fhd', 'sd', 'qhd', 'uhd'];

    for (const size of preferredOrder) {
      const match = mp4Renditions.find((rendition) => rendition.size === size);
      if (match) return match;
    }

    return mp4Renditions[0] || renditions.find((rendition) => rendition.type === 'video');
  }

  #getPrimaryAudioRendition(): Rendition | undefined {
    const renditions = (this._data?.video?.renditions || []) as Rendition[];
    if (!renditions.length) return undefined;

    return renditions.find(
      (rendition) =>
        rendition.type === 'audio' ||
        rendition.container === 'mp3' ||
        rendition.codec === 'mp3',
    );
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-files')) {
    window.customElements.define('mave-files', Files);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-files': Files;
  }
}
