import { Player } from './player';

/** Plays only published audio tracks, including those extracted from video uploads. */
export class Audio extends Player {
  protected get isAudio(): boolean {
    return true;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('mave-audio')) {
    window.customElements.define('mave-audio', Audio);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mave-audio': Audio;
  }
}
