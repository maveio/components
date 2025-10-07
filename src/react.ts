'use client';

import '@lit-labs/ssr-dom-shim';

import { createComponent } from '@lit/react';
import React from 'react';

import { Clip as ClipComponent } from './components/clip.js';
export const Clip = createComponent({
  tagName: 'mave-clip',
  elementClass: ClipComponent,
  react: React,
});

import { List as ListComponent } from './components/list.js';
export const List = createComponent({
  tagName: 'mave-list',
  elementClass: ListComponent,
  react: React,
});

import { Player as PlayerComponent } from './components/player.js';
export const Player = createComponent({
  tagName: 'mave-player',
  elementClass: PlayerComponent,
  react: React,
});

import { Upload as UploadComponent } from './components/upload.js';
export const Upload = createComponent({
  tagName: 'mave-upload',
  elementClass: UploadComponent,
  react: React,
});

import { Files as FilesComponent } from './components/files.js';
export const Files = createComponent({
  tagName: 'mave-files',
  elementClass: FilesComponent,
  react: React,
});

import { Image as ImageComponent } from './components/img.js';
export const Image = createComponent({
  tagName: 'mave-img',
  elementClass: ImageComponent,
  react: React,
});

import { Text as TextComponent } from './components/text.js';
export const Text = createComponent({
  tagName: 'mave-text',
  elementClass: TextComponent,
  react: React,
});

import { Pop as PopComponent } from './components/pop.js';
export const Pop = createComponent({
  tagName: 'mave-pop',
  elementClass: PopComponent,
  react: React,
});

export { setConfig } from './config.js';
