import { StatusRenderer, Task } from '@lit/task';
import { ReactiveControllerHost } from 'lit';

import { Config } from '../config';
import * as API from './api';

// More compatible version of:
// const regex = /(?<!\bwww\.\S+)(?<!@\S+)(?<!\.\d)(?<=[.!?])\s+/g;
function splitText(text: string) {
  // Splitting by a period, exclamation mark, or question mark followed by a space.
  const parts = text.split(/([.!?])\s+/);
  const sentences = [];
  let currentSentence = '';

  for (let i = 0; i < parts.length; i++) {
    currentSentence += parts[i];

    // Check if the current part ends with 'www.', '@', or is part of a decimal number.
    if (/\bwww\.$/.test(parts[i]) || /@$/.test(parts[i]) || /\.\d$/.test(parts[i])) {
      continue;
    }

    // If it's the end of a sentence, push it to the sentences array and reset currentSentence.
    if (/[.!?]$/.test(parts[i])) {
      sentences.push(currentSentence);
      currentSentence = '';
    }
  }

  // Add any remaining sentence part.
  if (currentSentence) {
    sentences.push(currentSentence);
  }

  return sentences;
}

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
          if (response.status !== 200) throw new Error();
          const data = await response.json();

          // Split the text using the regular expression
          // const sentences = splitText(data.text.trim());

          const words = data.segments
            .flatMap((segment: API.Segment) => segment.words)
            .map((word: API.Word) => {
              return {
                start: word.start,
                end: word.end,
                word: word.word.trim(),
              };
            });

          const sentences: API.Segment[] = [];
          let currentSentence: API.Segment = {
            start: 0,
            end: 0,
            text: '',
            words: [],
          };

          words.forEach((wordObj: API.Word) => {
            const { start, end, word } = wordObj;

            if (currentSentence.start === 0) {
              currentSentence.start = start;
            }

            currentSentence.end = end;
            currentSentence.words.push(wordObj);
            currentSentence.text += (currentSentence.text ? ' ' : '') + word;

            // Check if the word ends with a punctuation mark
            if (/[.!?]$/.test(word)) {
              sentences.push({ ...currentSentence });

              currentSentence = {
                start: 0,
                end: 0,
                text: '',
                words: [],
              };
            }
          });

          if (currentSentence.words.length > 0) {
            sentences.push({ ...currentSentence });
          }

          const paragraphs: API.Segment[] = [];
          const timeGapThreshold = 1;
          const maxSentencesPerParagraph = 5;

          if (sentences.length > 0) {
            let currentParagraph: API.Segment = {
              start: sentences[0].start,
              end: sentences[0].end,
              text: sentences[0].text,
              words: sentences[0].words,
            };

            let sentenceCount = 1;

            for (let i = 1; i < sentences.length; i++) {
              const currentSentence = sentences[i];
              const previousSentence = sentences[i - 1];

              const currentStart = currentSentence.start ?? 0;
              const previousEnd = previousSentence.end ?? 0;

              if (
                currentStart - previousEnd <= timeGapThreshold &&
                sentenceCount < maxSentencesPerParagraph
              ) {
                currentParagraph.end = currentSentence.end;
                currentParagraph.text += ' ' + currentSentence.text;
                currentParagraph.words = [
                  ...currentParagraph.words,
                  ...currentSentence.words,
                ];
                sentenceCount++;
              } else {
                paragraphs.push({ ...currentParagraph });

                currentParagraph = {
                  start: currentSentence.start,
                  end: currentSentence.end,
                  text: currentSentence.text,
                  words: currentSentence.words,
                };
                sentenceCount = 1;
              }
            }

            if (currentParagraph.words.length > 0) {
              paragraphs.push(currentParagraph);
            }
          }

          // Return the final structure
          return { text: data.text, segments: paragraphs } as Partial<API.Caption>;
        } catch (e) {
          console.warn(`Failed to fetch language file for "${this.embed}"`);
          throw new Error();
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
    return '/';
  }

  set version(value: number) {
    if (this._version != value) {
      this._version = value;
      this.host.requestUpdate();
    }
  }

  get cdnRoot(): string {
    return Config.cdn.endpoint.replace('${this.spaceId}', this.spaceId);
  }

  embedFile(file: string, params = new URLSearchParams()): string {
    const url = new URL(
      `${this.cdnRoot}/${this.embedId}${
        file == 'manifest.json' ? '/' : this.version
      }${file}`,
    );
    if (this.token) params.append('token', this.token);
    url.search = params.toString();
    return url.toString();
  }

  render(renderFunctions: StatusRenderer<unknown>) {
    return this.task?.render(renderFunctions);
  }
}
