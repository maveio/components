'use client';

import { createComponent } from '@lit/react';
import React from 'react';

function ensureDefined(tag: string, element: CustomElementConstructor) {
  if (typeof window === 'undefined') return;
  if (!window.customElements) return;
  if (!window.customElements.get(tag)) {
    window.customElements.define(tag, element);
  }
}

import { Clip as ClipComponent } from './components/clip.js';
ensureDefined('mave-clip', ClipComponent);
export const Clip = createComponent({
  tagName: 'mave-clip',
  elementClass: ClipComponent,
  react: React,
});

import { List as ListComponent } from './components/list.js';
ensureDefined('mave-list', ListComponent);
export const List = createComponent({
  tagName: 'mave-list',
  elementClass: ListComponent,
  react: React,
});

import { Player as PlayerComponent } from './components/player.js';
ensureDefined('mave-player', PlayerComponent);
export const Player = createComponent({
  tagName: 'mave-player',
  elementClass: PlayerComponent,
  react: React,
});

import { Upload as UploadComponent } from './components/upload.js';
ensureDefined('mave-upload', UploadComponent);
export const Upload = createComponent({
  tagName: 'mave-upload',
  elementClass: UploadComponent,
  react: React,
});

import { Files as FilesComponent } from './components/files.js';
ensureDefined('mave-files', FilesComponent);
export const Files = createComponent({
  tagName: 'mave-files',
  elementClass: FilesComponent,
  react: React,
});

import { Image as ImageComponent } from './components/img.js';
ensureDefined('mave-img', ImageComponent);
export const Image = createComponent({
  tagName: 'mave-img',
  elementClass: ImageComponent,
  react: React,
});

import { Text as TextComponent } from './components/text.js';
ensureDefined('mave-text', TextComponent);
export const Text = createComponent({
  tagName: 'mave-text',
  elementClass: TextComponent,
  react: React,
});

import { Pop as PopComponent } from './components/pop.js';
ensureDefined('mave-pop', PopComponent);
export const Pop = createComponent({
  tagName: 'mave-pop',
  elementClass: PopComponent,
  react: React,
});

export { setConfig } from './config.js';
