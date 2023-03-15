import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Channel } from 'phoenix';
import * as tus from 'tus-js-client';

import Data from '../embed/socket';

const fileTypes = [
  'video/3gpp',
  'video/mpeg',
  'video/mp4',
  'video/ogg',
  'video/quicktime',
  'video/webm',
];

@customElement('mave-upload')
export class Upload extends LitElement {
  @property() token: string;
  @state() _progress: number;
  @state() _upload_id: string;
  @state() _completed = false;
  private channel: Channel;

  static styles = css`
    :host {
      all: initial;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      position: relative;
      background: white;
      font-family: system-ui;
      box-shadow: inset 0 0 0 1px #eee;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.channel = Data.connect(this.token);
    this.channel.on('initiate', (data) => {
      this._upload_id = data.upload_id;
    });
    this.channel.on('completed', this.completed.bind(this));
    this.channel.on('error', this.error.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.channel.leave();
  }

  handleForm(event: InputEvent) {
    // TODO:
    // split progress into multiple files
    this._progress = 1;
    const target = event.target as HTMLInputElement;
    if (target.files) {
      for (const file of target.files) {
        if (fileTypes.includes(file.type)) {
          this.upload(file);
        }
      }
    }
  }

  upload(file: File) {
    const upload = new tus.Upload(file, {
      endpoint: '__MAVE_UPLOAD_ENDPOINT__',
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
      metadata: {
        title: file.name,
        filetype: file.type,
        token: this.token,
        upload_id: this._upload_id,
      },
      onError: (e) => {
        console.log(e);
      },
      onProgress: (uploaded, total) => {
        const progress = Math.round((uploaded / total) * 100);
        if (progress > this._progress) this._progress = progress;
      },
      onSuccess: () => {
        this._progress = 100;
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
    this._completed = true;
    this.dispatchEvent(
      new CustomEvent('completed', { bubbles: true, composed: true, detail: data }),
    );
  }

  // registry call
  error() {
    // console.warn(`[mave elements] ${data.message}`);
    // this.dispatchEvent(new CustomEvent('error', { bubbles: true, detail: data }));
  }

  render() {
    return html`${this._progress ? this.renderProgress() : this.renderUpload()}`;
  }

  renderUpload() {
    return html`<form>
      <input .disabled=${!this._upload_id} type="file" @change=${this.handleForm} />
    </form>`;
  }

  renderProgress() {
    return html`
      ${this._progress == 100
        ? this.renderProcessing()
        : html`
            <div class="progress">
              <div
                class="progress-bar"
                role="progressbar"
                style="width: ${this._progress}%;"
              >
                ${this._progress}%
              </div>
            </div>
          `}
    `;
  }

  renderProcessing() {
    return html`${this._completed ? html`done` : html`processing...`}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-upload': Upload;
  }
}
