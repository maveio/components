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

interface UploadErrorDetail {
  file?: File;
  reason: string;
  message?: string;
  allowedExtensions?: {
    video: string[];
    audio: string[];
  };
}

interface EmbedChannel {
  token: string;
  channel: Channel;
  upload_id?: string;
}

type UploadState = 'initial' | 'uploading' | 'processing' | 'done' | 'error';

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
  @state() _error: UploadErrorDetail | null = null;
  @state() private _hasErrorSlot = false;
  private embedChannel: EmbedChannel;
  @query('#mave-upload-input') private fileInput?: HTMLInputElement;
  private playableEmitted = false;
  private currentEmbed?: string;
  private slotObserver?: MutationObserver;

  private static readonly SUPPORTED_VIDEO_EXTENSIONS = new Set([
    '3g2',
    '3gp',
    'avi',
    'mov',
    'mp4',
    'm4v',
    'mkv',
    'qt',
    'ts',
    'mts',
    'm2t',
    'm2ts',
    'webm',
  ]);

  private static readonly SUPPORTED_AUDIO_EXTENSIONS = new Set([
    'aac',
    'amr',
    'flac',
    'm4a',
    'm4b',
    'm4p',
    'mp3',
    'ogg',
    'wav',
  ]);

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

    .state--error {
      transition: box-shadow 160ms ease;
      gap: 12px;
    }

    .upload-default-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
      width: 100%;
      padding: 0 24px;
    }

    .upload-default-error-filename {
      font-size: 14px;
      font-weight: 500;
      color: #111;
      max-width: 320px;
      overflow-wrap: anywhere;
    }

    .upload-default-error-title {
      font-size: 24px;
      font-weight: 400;
      color: #e5484d;
    }

    .upload-default-error-subtitle {
      opacity: 0.6;
      max-width: 320px;
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
    this.updateHasErrorSlot();
    if (typeof MutationObserver !== 'undefined') {
      this.slotObserver = new MutationObserver(() => {
        this.updateHasErrorSlot();
      });
      this.slotObserver.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['slot'],
      });
    }

    this.embedChannel = Data.connect(this.token);
    if (this.embedChannel.upload_id) {
      this._upload_id = this.embedChannel.upload_id;
    }
    this.embedChannel.channel.on('initiate', ({ upload_id }) => {
      this._upload_id = upload_id;
      this.embedChannel.upload_id = upload_id;
      this.playableEmitted = false;
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
    this._error = null;
    this.playableEmitted = false;
    this.currentEmbed = undefined;
    this.embedChannel.channel.push('reset', {});
  }

  disconnectedCallback() {
    Data.disconnect(this.embedChannel);
    this.removeEventListener('click', this.handleActionClick);
    this.removeEventListener('keydown', this.handleActionKeyDown);
    this.slotObserver?.disconnect();
    this.slotObserver = undefined;
    super.disconnectedCallback();
  }

  handleDrop(event: DragEvent) {
    event.preventDefault();
    this._dragging = false;
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      return;
    }

    const files: File[] = [];
    if (dataTransfer.items) {
      for (const item of dataTransfer.items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
    } else if (dataTransfer.files) {
      for (const file of dataTransfer.files) {
        files.push(file);
      }
    }

    if (!files.length) {
      return;
    }

    this._error = null;

    let hasValidFile = false;
    for (const file of files) {
      if (this.isSupportedFile(file)) {
        if (!hasValidFile) {
          this._progress = 1;
          hasValidFile = true;
        }
        this.upload(file);
      } else {
        this.handleUnsupportedFile(file);
      }
    }
  }

  handleForm(event: InputEvent) {
    // TODO:
    // split progress into multiple files
    const target = event.target as HTMLInputElement;
    if (target.files) {
      if (target.files.length) {
        this._error = null;
      }
      let hasValidFile = false;
      for (const file of target.files) {
        if (this.isSupportedFile(file)) {
          if (!hasValidFile) {
            this._progress = 1;
            hasValidFile = true;
          }
          this.upload(file);
        } else {
          this.handleUnsupportedFile(file);
        }
      }
      target.value = '';
    }
  }

  upload(file: File) {
    this.dispatchEvent(
      new CustomEvent('upload', { bubbles: true, composed: true, detail: { file } }),
    );
    this._error = null;

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
    this.currentEmbed = data?.embed;
    if (!this.disableCompletion) this._completed = true;
    this.dispatchEvent(
      new CustomEvent('completed', { bubbles: true, composed: true, detail: data }),
    );
  }

  rendition(data: any) {
    if (!this.playableEmitted && this.isPlayableRendition(data)) {
      this.playableEmitted = true;
      this.dispatchEvent(
        new CustomEvent('playable', {
          bubbles: true,
          composed: true,
          detail: { embed: this.currentEmbed },
        }),
      );
    }
    this.dispatchEvent(
      new CustomEvent('rendition', { bubbles: true, composed: true, detail: data }),
    );
  }

  // registry call
  error(error: ErrorMessage) {
    console.warn(`[mave-upload] ${error.message}`);
    this._error = {
      reason: 'upload error',
      message: error.message,
    };
    this._progress = 0;
    this._completed = false;
    this.dispatchEvent(new CustomEvent('error', { bubbles: true, detail: error }));
  }

  private isPlayableRendition(rendition: { container?: string; type?: string }) {
    return (
      typeof rendition?.container === 'string' &&
      rendition.container === 'hls' &&
      rendition?.type === 'video'
    );
  }

  private updateHasErrorSlot(_event?: Event) {
    const hasSlot = !!this.querySelector('[slot="error"]');
    if (this._hasErrorSlot !== hasSlot) {
      this._hasErrorSlot = hasSlot;
    }
  }

  render() {
    switch (this.currentState) {
      case 'error':
        return this.renderError();
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
    if (this._error) {
      return 'error';
    }
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

  openFileDialog() {
    if (this.fileInput && !this.fileInput.disabled) {
      this.fileInput.click();
    }
  }

  findActionTarget(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.hasAttribute('data-mave-upload-select')) {
        return node;
      }
    }
    return null;
  }

  handleActionClick(event: Event) {
    const target = this.findActionTarget(event);
    if (target) {
      event.preventDefault();
      this.openFileDialog();
    }
  }

  handleActionKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = this.findActionTarget(event);
    if (target) {
      event.preventDefault();
      this.openFileDialog();
    }
  }

  blockSubmit(event: Event) {
    event.preventDefault();
  }

  handleDragEnter(event: DragEvent) {
    event.preventDefault();
    this._dragging = true;
  }

  handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this._dragging = true;
  }

  handleDragLeave(event: DragEvent) {
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
  }

  isSupportedFile(file: File): boolean {
    const type = (file.type || '').toLowerCase();
    const extension = Upload.getFileExtension(file);

    if (type.startsWith('video/')) {
      return !extension || Upload.SUPPORTED_VIDEO_EXTENSIONS.has(extension);
    }

    if (type.startsWith('audio/')) {
      return !extension || Upload.SUPPORTED_AUDIO_EXTENSIONS.has(extension);
    }

    if (!extension) {
      return false;
    }

    if (Upload.SUPPORTED_VIDEO_EXTENSIONS.has(extension)) {
      return true;
    }

    if (Upload.SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
      return true;
    }

    return false;
  }

  static getFileExtension(file: File): string | undefined {
    const name = file.name || '';
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === name.length - 1) {
      return undefined;
    }
    return name.slice(dotIndex + 1).toLowerCase();
  }

  handleUnsupportedFile(file: File) {
    const detail: UploadErrorDetail = {
      file,
      reason: 'unsupported type',
      allowedExtensions: {
        video: Array.from(Upload.SUPPORTED_VIDEO_EXTENSIONS),
        audio: Array.from(Upload.SUPPORTED_AUDIO_EXTENSIONS),
      },
    };

    this._error = detail;
    this._progress = 0;
    this._completed = false;

    this.dispatchEvent(
      new CustomEvent('invalid', {
        bubbles: true,
        composed: true,
        detail: {
          ...detail,
          message: msg('unsupported file type'),
        },
      }),
    );
  }

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
            error: this._error,
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

  renderError() {
    if (!this._hasErrorSlot) {
      return this.renderInitial();
    }
    return html`<form
      class="state state--error"
      style=${styleMap({ ...this.styleOpacity(), ...this.styleFont() })}
      @submit=${this.blockSubmit}
      @dragenter=${this.handleDragEnter}
      @dragover=${this.handleDragOver}
      @dragleave=${this.handleDragLeave}
      @drop=${this.handleDrop}
    >
      <slot name="error" @slotchange=${this.updateHasErrorSlot}></slot>
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
