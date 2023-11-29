import { StatusRenderer, Task } from '@lit-labs/task';
import { ReactiveControllerHost } from 'lit';

import * as API from './api';

export class CaptionController {
  host: ReactiveControllerHost;
  private task: Task;
  private _embed: string;
  private _token: string;
  private _version: number;

  constructor(host: ReactiveControllerHost, embed: string) {
    this.host = host;
    this.embed = embed;

    this.task = new Task(
      this.host,
      async () => {
        try {
          const url = this.embedFile('subtitle.json');

          const response = await fetch(url);
          const data = await response.json();

          // create sentences based on ., !, ?

          // Regular expression to split the text while handling common cases
          const regex = /(?<!\bwww\.\S+)(?<!@\S+)(?<!\.\d)(?<=[.!?])\s+/g;

          // Split the text using the regular expression
          const sentences = data.text.trim().split(regex);
          const words = data.segments.flatMap((segment: API.Segment) => segment.words).map((word: API.Word) => {
            return {
              start: word.start,
              end: word.end,
              word: word.word.trim()
            }
          });

          // create segments based on sentences
          let currentWordIndex = 0;
          const segments = sentences.map((sentence: String) => {

            // grab last word from sentence
            const lastWord = sentence.split(' ').pop();

            // go through words from currentWordIndex and use the sentence until you have completed the sentence
            const possibleWordCount = sentence.split(' ').length;
            const possibleWords = words.slice(currentWordIndex, currentWordIndex + possibleWordCount + 10);

            const lastWordIndex = possibleWords.findIndex((word: API.Word) => word.word == lastWord) + 1;

            const sentenceWords = words.slice(currentWordIndex, currentWordIndex + lastWordIndex);

            currentWordIndex += lastWordIndex;
            return {
              start: sentenceWords[0].start,
              end: sentenceWords[sentenceWords.length - 1].end,
              text: sentence,
              words: sentenceWords
            }
          })


          return { text: data.text, segments: segments } as Partial<API.Caption>;
        } catch (e) {
          console.log(e);
          throw new Error(`Failed to fetch language file for "${this.embed}"`);
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

  set token(value: string) {
    if (this._token != value) {
      this._token = value;
      this.host.requestUpdate();
    }
  }

  get token() {
    return this._token;
  }

  get spaceId(): string {
    return this.embed.substring(0, 5);
  }

  get embedId(): string {
    return this.embed.substring(5, this.embed.length);
  }

  get version(): string {
    if (this._version) {
      return `/v${this._version}/`;
    }
    return '/'
  }

  set version(value: number) {
    if (this._version != value) {
      this._version = value;
      this.host.requestUpdate();
    }
  }

  get cdnRoot(): string {
    return `https://space-${this.spaceId}.video-dns.com`;
  }

  embedFile(file: string, params = new URLSearchParams()): string {
    const url = new URL(`${this.cdnRoot}/${this.embedId}${file == 'manifest' ? '/' : this.version}${file}`);
    if (this.token) params.append('token', this.token);
    url.search = params.toString();
    return url.toString();
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
