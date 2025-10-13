import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Channel } from 'phoenix';
import * as tus from 'tus-js-client';

import { Config } from '../config';
import Data from '../embed/socket';
import { LanguageController, localized, msg } from '../utils/localization';

interface ErrorMessage {
  message: string;
}

interface EmbedChannel {
  token: string;
  channel: Channel;
  upload_id?: string;
}

@localized()
export class Upload extends LitElement {
  @property() token: string;
  @property() locale: string;
  @property() color: string;
  @property() font: string;
  @property() radius: string;
  @property({ type: Boolean }) disableCompletion = false;

  @state() _progress: number;
  @state() _upload_id: string;
  @state() _completed = false;
  private embedChannel: EmbedChannel;

  private languageController = new LanguageController(this);

  static styles = css`
    :host {
      all: initial;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      position: relative;
      background: white;
      box-shadow: inset 0 0 0 1px #eee;
    }

    .state {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: white;
      width: 100%;
      height: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.languageController.locale = this.locale || 'en';

    this.embedChannel = Data.connect(this.token);
    if (this.embedChannel.upload_id) {
      this._upload_id = this.embedChannel.upload_id;
    }
    this.embedChannel.channel.on('initiate', ({ upload_id }) => {
      this._upload_id = upload_id;
      this.embedChannel.upload_id = upload_id;
    });
    this.embedChannel.channel.on('completed', this.completed.bind(this));
    this.embedChannel.channel.on('rendition', this.rendition.bind(this));
    this.embedChannel.channel.on('error', this.error.bind(this));
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown) {
    super.requestUpdate(name, oldValue);
    if (name === 'locale') {
      this.languageController.locale = this.locale;
    }
  }

  reset() {
    this._progress = 0;
    this._completed = false;
    this.embedChannel.channel.push('reset', {});
  }

  disconnectedCallback() {
    // TODO: implement a disconnect method
    // Data.disconnect(this.embedChannel);
    super.disconnectedCallback();
  }

  handleDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.items) {
      for (const item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (
            file &&
            (file.type.startsWith('video/') || file.type.startsWith('audio/'))
          ) {
            this._progress = 1;
            this.upload(file);
          }
        }
      }
    } else {
      if (event.dataTransfer && event.dataTransfer.files) {
        for (const file of event.dataTransfer.files) {
          if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            this._progress = 1;
            this.upload(file);
          }
        }
      }
    }
  }

  handleForm(event: InputEvent) {
    // TODO:
    // split progress into multiple files
    this._progress = 1;
    const target = event.target as HTMLInputElement;
    if (target.files) {
      for (const file of target.files) {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          this.upload(file);
        }
      }
    }
  }

  upload(file: File) {
    this.dispatchEvent(
      new CustomEvent('upload', { bubbles: true, composed: true, detail: { file } }),
    );

    const upload = new tus.Upload(file, {
      endpoint: Config.upload.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
      metadata: {
        title: file.name,
        filetype: file.type,
        token: this.token,
        upload_id: this._upload_id,
      },
      onError: (e) => {
        console.log(e);
        this.dispatchEvent(
          new CustomEvent('failed', { bubbles: true, composed: true, detail: e }),
        );
      },
      onProgress: (uploaded, total) => {
        const progress = Math.round((uploaded / total) * 100);
        if (progress > this._progress) this._progress = progress;
        this.dispatchEvent(
          new CustomEvent('progress', {
            bubbles: true,
            composed: true,
            detail: { progress },
          }),
        );
      },
      onSuccess: () => {
        this._progress = 100;
        this.dispatchEvent(
          new CustomEvent('processing', { bubbles: true, composed: true }),
        );
      },
      removeFingerprintOnSuccess: true,
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      upload.start();
    });
  }

  completed(data: { embed: string }) {
    if (!this.disableCompletion) this._completed = true;
    this.dispatchEvent(
      new CustomEvent('completed', { bubbles: true, composed: true, detail: data }),
    );
  }

  rendition(data: any) {
    this.dispatchEvent(
      new CustomEvent('rendition', { bubbles: true, composed: true, detail: data }),
    );
  }

  // registry call
  error(error: ErrorMessage) {
    console.warn(`[mave-upload] ${error.message}`);
    this.dispatchEvent(new CustomEvent('error', { bubbles: true, detail: error }));
  }

  render() {
    return html` ${this._progress ? this.renderProgress() : this.renderUpload()} `;
  }

  styleOpacity() {
    if (!this.languageController.loaded) {
      return { pointerEvents: 'none', opacity: '0' };
    }
    if (!this._upload_id) {
      return { pointerEvents: 'none', opacity: '0.5' };
    }
    return {};
  }

  styleFont() {
    if (this.font) {
      return { fontFamily: this.font };
    } else {
      return { fontFamily: 'system-ui' };
    }
  }

  renderUpload() {
    return html`<form
      class="state"
      style=${styleMap({ ...this.styleOpacity(), ...this.styleFont() })}
      @dragover=${(e: DragEvent) => e.preventDefault()}
      @drop=${this.handleDrop}
      onDragOver="this.style.boxShadow='inset 0 0 0 2px blue'"
      onDragLeave="this.style.boxShadow='inset 0 0 0 2px transparent'"
    >
      <div style="font-size: 32px; padding-bottom: 14px; font-weight: 300; opacity: 0.9;">
        ${msg('drop video here')}
      </div>
      <div style="padding-bottom: 40px; opacity: 0.5;">
        ${msg('or browse your files')}
      </div>
      <div
        style="position: relative; background: ${this.color
          ? this.color
          : '#1997FF'}; width: 150px; height: 40px; overflow: hidden; border-radius: ${this
          .radius
          ? this.radius
          : '16px'}; color: white;"
        onMouseOver="this.style.opacity='0.9'"
        onMouseOut="this.style.opacity='1'"
      >
        <input
          .disabled=${!this._upload_id}
          type="file"
          accept="video/*, audio/*"
          @change=${this.handleForm}
          style="position: absolute; top: 0; left: -150px; display: block; width: 500px; height: 100%; opacity: 0; cursor: pointer;"
        />
        <div
          style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; text-align: center;"
        >
          <div style="padding-bottom: 2px;">${msg('select file')}</div>
        </div>
      </div>
    </form>`;
  }

  renderProgress() {
    return html`
      ${this._progress == 100
        ? this.renderProcessing()
        : html`
            <div class="state">
              <div
                style="width: 40%; height: 3px; border-radius: 3px; background: #ccc; overflow: hidden;"
              >
                <div
                  style="width: ${this
                    ._progress}%; height: 3px; background: #1997FF; transition-property: width; transition-duration: 200ms; transition-timing-function: cubic-bezier(0, 0, 0.2, 1);"
                ></div>
              </div>
              <div style="margin-top: 16px; opacity: 0.6; padding-bottom: 24px;">
                ${msg('uploading...')}
              </div>
            </div>
          `}
    `;
  }

  renderProcessing() {
    return html`<div class="state">
      <div style="width: 100%; height: 3px;"></div>
      <div style="margin-top: 16px; opacity: 0.6; padding-bottom: 24px;">
        ${this._completed ? msg('done') : msg('just a minute...')}
      </div>
    </div>`;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-upload')) {
    window.customElements.define('mave-upload', Upload);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-upload': Upload;
  }
}
