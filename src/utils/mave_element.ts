import { LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import { Config } from '../config';

export class MaveElement extends LitElement {
  _embed: string;

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
}
