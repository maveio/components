import { css, html, LitElement, PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
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

type UploadState = 'initial' | 'uploading' | 'processing' | 'done';

@localized()
export class Upload extends LitElement {
  @property() token: string;
  @property() locale: string;
  @property() color: string;
  @property() font: string;
  @property() radius: string;
  @property({ type: Boolean }) disableCompletion = false;

  @state() _progress = 0;
  @state() _upload_id: string;
  @state() _completed = false;
  @state() _dragging = false;
  private embedChannel: EmbedChannel;
  @query('#mave-upload-input') private fileInput?: HTMLInputElement;

  private languageController = new LanguageController(this);
  private lastState: UploadState = 'initial';
  private lastProgress = -1;

  static styles = css`
    :host {
      all: initial;
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      position: relative;
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

    .state--initial {
      transition: box-shadow 160ms ease;
      gap: 12px;
    }

    .upload-default-title {
      font-size: 32px;
      padding-bottom: 2px;
      font-weight: 300;
      opacity: 0.9;
      text-align: center;
    }

    .upload-default-subtitle {
      opacity: 0.5;
      padding-bottom: 16px;
      text-align: center;
    }

    .upload-default-button {
      position: relative;
      width: 150px;
      height: 40px;
      overflow: hidden;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      border: none;
      font: inherit;
      text-transform: none;
      background: #1997ff;
      border-radius: 16px;
      transition: opacity 160ms ease;
    }

    .upload-default-button:hover,
    .upload-default-button:focus {
      opacity: 0.9;
      outline: none;
    }

    .upload-default-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .upload-default-progress {
      width: 70%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .upload-default-progress-bar {
      width: 100%;
      height: 4px;
      border-radius: 999px;
      background: #e6e6e6;
      overflow: hidden;
    }

    .upload-default-progress-value {
      height: 100%;
      background: #1997ff;
      transition: width 200ms cubic-bezier(0, 0, 0.2, 1);
    }

    .upload-default-progress-label {
      opacity: 0.6;
    }

    .upload-default-status {
      opacity: 0.6;
      padding-bottom: 24px;
      text-align: center;
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', this.handleActionClick);
    this.addEventListener('keydown', this.handleActionKeyDown);

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
    this.removeEventListener('click', this.handleActionClick);
    this.removeEventListener('keydown', this.handleActionKeyDown);
    super.disconnectedCallback();
  }

  handleDrop(event: DragEvent) {
    event.preventDefault();
    this._dragging = false;
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
    switch (this.currentState) {
      case 'uploading':
        return this.renderUploading();
      case 'processing':
        return this.renderProcessing();
      case 'done':
        return this.renderDone();
      default:
        return this.renderInitial();
    }
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

  get currentState(): UploadState {
    if (this._completed) {
      return 'done';
    }
    if (this._progress >= 100 && this._progress > 0) {
      return 'processing';
    }
    if (this._progress > 0) {
      return 'uploading';
    }
    return 'initial';
  }

  private openFileDialog() {
    if (this.fileInput && !this.fileInput.disabled) {
      this.fileInput.click();
    }
  }

  private findActionTarget(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.hasAttribute('data-mave-upload-select')) {
        return node;
      }
    }
    return null;
  }

  private handleActionClick = (event: Event) => {
    const target = this.findActionTarget(event);
    if (target) {
      event.preventDefault();
      this.openFileDialog();
    }
  };

  private handleActionKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = this.findActionTarget(event);
    if (target) {
      event.preventDefault();
      this.openFileDialog();
    }
  };

  private blockSubmit = (event: Event) => {
    event.preventDefault();
  };

  private handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    this._dragging = true;
  };

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this._dragging = true;
  };

  private handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    const container = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget;

    if (!container) {
      this._dragging = false;
      return;
    }

    if (!related || !(related instanceof Node) || !container.contains(related)) {
      this._dragging = false;
    }
  };

  protected updated(changedProperties: PropertyValues<Upload>) {
    super.updated(changedProperties);
    const progress = this._progress || 0;
    const state = this.currentState;

    this.setAttribute('state', state);
    this.setAttribute('progress', `${progress}`);
    this.toggleAttribute('drag-over', this._dragging);
    this.toggleAttribute('ready', !!this._upload_id && this.languageController.loaded);

    const stateChanged = state !== this.lastState;
    const progressChanged = progress !== this.lastProgress;
    const draggingChanged = changedProperties.has('_dragging');

    if (stateChanged || progressChanged || draggingChanged) {
      this.dispatchEvent(
        new CustomEvent('statechange', {
          bubbles: true,
          composed: true,
          detail: {
            state,
            progress,
            dragging: this._dragging,
          },
        }),
      );
    }

    this.lastState = state;
    this.lastProgress = progress;
  }

  renderInitial() {
    const buttonColor = this.color ? this.color : '#1997FF';
    const radius = this.radius ? this.radius : '16px';
    return html`<form
      class="state state--initial"
      style=${styleMap({ ...this.styleOpacity(), ...this.styleFont() })}
      @submit=${this.blockSubmit}
      @dragenter=${this.handleDragEnter}
      @dragover=${this.handleDragOver}
      @dragleave=${this.handleDragLeave}
      @drop=${this.handleDrop}
    >
      <slot name="initial">
        <div class="upload-default-title">${msg('drop video here')}</div>
        <div class="upload-default-subtitle">${msg('or browse your files')}</div>
        <button
          type="button"
          data-mave-upload-select
          class="upload-default-button"
          style=${styleMap({ background: buttonColor, borderRadius: radius })}
        >
          ${msg('select file')}
        </button>
      </slot>
      <input
        id="mave-upload-input"
        .disabled=${!this._upload_id}
        type="file"
        accept="video/*, audio/*"
        @change=${this.handleForm}
        hidden
      />
    </form>`;
  }

  renderUploading() {
    const progress = Math.max(0, Math.min(100, this._progress || 0));
    return html`<div class="state state--uploading" style=${styleMap(this.styleFont())}>
      <slot name="uploading">
        <div class="upload-default-progress" role="status">
          <div
            class="upload-default-progress-bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow=${progress}
          >
            <div class="upload-default-progress-value" style="width: ${progress}%;"></div>
          </div>
          <div class="upload-default-progress-label">${msg('uploading...')}</div>
        </div>
      </slot>
    </div>`;
  }

  renderProcessing() {
    return html`<div class="state state--processing" style=${styleMap(this.styleFont())}>
      <slot name="processing">
        <div class="upload-default-status" role="status">${msg('just a minute...')}</div>
      </slot>
    </div>`;
  }

  renderDone() {
    return html`<div class="state state--done" style=${styleMap(this.styleFont())}>
      <slot name="done">
        <div class="upload-default-status" role="status">${msg('done')}</div>
      </slot>
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
