import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { Embed } from '../embed/api';
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
    }
  `;

  render() {
    return html`
      ${this.embedController.render({
        pending: this.renderPending,
        complete: (data) => {
          this._data = data as Embed;
          if (!data) return;

          const templates = this._slottedChildren
            .map((item: any) => {
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
                const template = createClone();

                // created_at
                const createdAt = new Date(this._data.created_at);
                if(createdAt) this.#setTextContent(template, '[slot="date"]', createdAt.toLocaleDateString().replaceAll('/', '-'));

                // duration
                const duration = this._data.video.duration;
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const minutesString = minutes < 10 ? `0${minutes}` : minutes.toString();
                const seconds = Math.floor(duration % 60);
                const secondsString = seconds < 10 ? `0${seconds}` : seconds.toString();
                const formattedDuration = `${hours ? hours + ':' : ''}${minutesString}:${secondsString}`;
                if(duration) this.#setTextContent(template, '[slot="duration"]', formattedDuration);

                // format
                const filetype = this._data.video.filetype;
                if (filetype) this.#setTextContent(template, '[slot="filetype"]', filetype);

                // size
                const size = this._data.video.size; // in bytes
                const sizeInMb = size / 1000000;

                console.log(size)
                if (size) this.#setTextContent(template, '[slot="size"]', `${sizeInMb.toFixed(1)} MB`);


                // download
                const link = this.#createDownloadLink(`${this.cdn_root}/${this.embedId}/h264_hd.mp4`, `${this._data.name}.mp4`);
                link.appendChild(template);

                return html`${link}`;
              }

              if (this._data.video.audio && item.getAttribute('name') == 'mave-files-audio') {
                const template = createClone();

                this.#setTextContent(template, '[slot="filetype"]', "mp3");

                const link = this.#createDownloadLink(`${this.cdn_root}/${this.embedId}/audio.mp3`, `${this._data.name}.mp3`);

                link.appendChild(template);

                return html`${link}`;
              }

              const subtitle = this._data.subtitles.find(l => l.language == this._data.video.language);

              if (subtitle && item.getAttribute('name') == 'mave-files-subtitles') {
                const template = createClone();

                this.#setTextContent(template, '[slot="filetype"]', "vtt");

                const link = this.#createDownloadLink(subtitle.path, `${this._data.name}.vtt`);

                link.appendChild(template);

                return html`${link}`;
              }
            })

          return html`${templates}`;
        },
      })}
    `;
  }

  renderPending() {
    return html`<slot style="display: none"></slot>`;
  }

  #setTextContent(template: DocumentFragment, selector: string, text: string) {
    const element = template.querySelector(selector);
    if (!element) return;
    element.textContent = text;
    element.removeAttribute('slot');
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
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then(blob => this.#downloadBlob(blob, filename))
      .catch(e => console.error('Something went wrong:', e));
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
      if(isDownloading) return;
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
}

if (window && window.customElements) {
  if (!window.customElements.get('mave-files')) {
    window.customElements.define('mave-files', Files);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-files': Files;
  }
}
