import { createComponent } from '@lit-labs/react';
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
