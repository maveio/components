import { StatusRenderer, Task } from '@lit-labs/task';
import { ReactiveControllerHost } from 'lit';

import * as API from './api';

export enum EmbedType {
  Collection,
  Embed
}

export class EmbedController {
  host: ReactiveControllerHost;
  private task: Task;
  private type: EmbedType;
  private _embed = '';

  constructor(host: ReactiveControllerHost, embedType: EmbedType = EmbedType.Embed) {
    this.host = host;
    this.type = embedType;

    this.task = new Task(
      host,
      async () => {
        try {
          if (!this.embed) return;
          const response = await fetch(`${API.baseUrl}/${this.embed}`);
          const data = await response.json();
          if (this.type == EmbedType.Embed) {
            return data as Partial<API.Embed>;
          } else {
            return data as Partial<API.Collection>;
          }

        } catch {
          throw new Error(`Failed to fetch "${this.embed}"`);
        }
      },
      () => [this.embed],
    );
  }

  set embed(value: string) {
    if (this._embed != value) {
      this._embed = value;
      this.host.requestUpdate();
    }
  }

  get embed() {
    return this._embed;
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task.render(renderFunctions);
  }
}
