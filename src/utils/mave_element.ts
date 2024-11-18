import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { Config } from '../config';

export class MaveElement extends LitElement {
  _embed: string;

  EVENT_TYPES = {
    CLICK: 'user_click',
  };

  @property({ type: String })
  get embed(): string {
    return this._embed;
  }

  set embed(value: string) {
    this._embed = value;
  }

  get embedId(): string {
    return this._embed?.substring(5, this._embed?.length);
  }

  get spaceId(): string {
    return this.embed?.substring(0, 5);
  }

  get cdn_root(): string {
    return Config.cdn.endpoint.replace('${this.spaceId}', this.spaceId);
  }

  get _stylesheets() {
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    return html`${Array.from(styles).map((style) => style.cloneNode(true))}`;
  }

  durationToTime(duration: number): string {
    const totalSeconds = Math.floor(duration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  emit(eventType: string, detail: any) {
    this.dispatchEvent(
      new CustomEvent(`mave:${eventType}`, { detail: { ...detail, eventType } }),
    );
    this.dispatchEvent(new CustomEvent('mave:*', { detail: { ...detail, eventType } }));
  }
}
