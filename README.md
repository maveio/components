<div>
<br />
<p style="padding: 4px 0;">
  <a href="https://mave.io">
    <picture>
      <source srcset="https://mave.io/images/logo_white.svg" media="(prefers-color-scheme: dark)">
      <img src="https://mave.io/images/logo.svg"  alt="mave.io logo black" style="width: 183px;">
    </picture>
  </a>
</p>

# components

[![npm version](https://img.shields.io/npm/v/%40maveio%2Fcomponents?color=5850ec)](https://www.npmjs.com/package/@maveio/components)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/maveio/components/github-code-scanning%2Fcodeql?label=CodeQL&color=5850ec)](https://github.com/maveio/components/actions/workflows/github-code-scanning/codeql)
[![Discord server](https://img.shields.io/badge/Discord-mave.io-5850ec)](https://discord.gg/SBCKwnwHkC)

Components are pre-built rich UI components that help you build your own video experiences across desktop and mobile (web). There is no need to run external iframes these days. This library leverages the power of [webcomponents](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), which makes it fast and has a small footprint. You can create a (free) account on [mave.io](https://mave.io).

[Install](#install) •
[Usage](#usage) •
[Contributing](#contributing) •
[Docs](https://mave.io/docs/)

## Get started

Include the following in your site (and [create an account](https://app.mave.io/signup)):

```html
<script
  type="module"
  src="https://cdn.video-dns.com/npm/@maveio/components/+esm"
></script>
```

and start using our [components](#usage)!

## Install

If you want to use our component library locally within your project:

```
npm install @maveio/components
```

And either use the regular version

```js
// include in your script.js
import { Player } from '@maveio/components';

// and use the component in your html
<mave-player embed="{embed id}"></mave-player>;
```

or use our React specific version:

```js
import { Player } from '@maveio/components/react';

function App() {
  return (
    <>
      <Player embed="{embed id}"></Player>
    </>
  );
}

export default App;
```

or Vue:

```js
<template>
  <Player embed="{embed id}"></Player>
</template>

<script setup lang="ts">
  import { Player } from '@maveio/components/vue';
</script>
```

## Usage

### Player

Once you have uploaded your first video you can show your videos in different formats. The most common used component is `<mave-player>`:

```html
<mave-player embed="{embed id}"></mave-player>
```

![player](https://github.com/maveio/components/assets/238946/bbf3a4d2-7172-4bfb-8b24-0f863492a5e5)

You can either change the settings through our interface or provide it as attributes. To learn which attributes you can use to change the appearance of your player, go to [our docs](https://docs.mave.io).

### Audio

`<mave-audio>` plays published audio tracks from **audio or video uploads** using
native `<audio>`. It never fetches a video rendition or original video as a fallback.
`<mave-player>` automatically uses the same audio presentation for audio-only
uploads. Existing embeds keep their tag, playback API, events, theme and color.
Video uploads continue to use the video player; use `<mave-audio>` to play only
their audio tracks.

```html
<!-- Both examples accept the same embed id, including a video upload. -->
<mave-audio embed="{embed id}" type="line"></mave-audio>
<mave-audio embed="{embed id}" theme="dolphin" type="wave"></mave-audio>
<!-- Automatically chooses audio or video from the uploaded media. -->
<mave-player embed="{embed id}" theme="dolphin" type="wave"></mave-player>
```

`type="line"` (default) shows a progress bar; `type="wave"` shows measured amplitude
peaks. Independently, `theme="default"`, `theme="dolphin"` and `theme="synthwave"`
reuse the video themes' buttons, icons, timeline styling, typography and `color`
contrast colors. Synthwave keeps its timeline above the controls.
The same audio attributes work on `<mave-player>` when it detects audio-only
media. Switching its `embed` between audio and video also switches presentation.

Audio defaults to `controls="full"`: play, time, seek, volume, captions and audio
track selection when available. Use an explicit list for fewer controls, `none`
to hide the controls or `big` for a large play button. `rate` and `airplay` are
explicit opt-ins, just as in the video player. Video-only controls are ignored.
`thumbnail` is always opt-in, including with `full`; omitting it hides the image
and avoids loading it. For example:

```html
<mave-audio embed="{embed id}" theme="dolphin" type="wave"
  controls="full rate thumbnail"></mave-audio>
<mave-audio embed="{embed id}" theme="synthwave" type="line"
  controls="play time seek volume"></mave-audio>
```

Optional `audio-title`, `audio-subtitle` and `audio-artwork` customize metadata.
The title defaults to the embed name and artwork to its poster. The public
playback methods, events, tokens and analytics are shared with Player. Audio
sizes to its content and shows an unavailable message for sources without a
published audio track. Changing `type` keeps the current playback position.
The same component is exported as `Audio` from `@maveio/components`,
`@maveio/components/react` and `@maveio/components/vue`:

```jsx
import { Audio } from '@maveio/components/react';

<Audio embed="{embed id}" theme="dolphin" type="wave" controls="full thumbnail" />
```

Additional CSS overrides: `--mave-audio-background` and `--mave-audio-radius`,
alongside the existing theme's control variables.

Waveforms use the optional manifest field
`waveform: {version: 1, duration, audio_track, peaks}`. Peaks are amplitudes from
0 to 1; `audio_track` identifies the analyzed track's filename. Core generates them
from the processed primary track of audio and video uploads. Missing, invalid,
mismatched-duration or different-track peaks fall back to the line timeline.
Switching language tracks preserves position and speed. Existing uploads need
reprocessing with the updated publishing preset to gain waveform data.

### Clip

```html
<mave-clip embed="{embed id}"></mave-clip>
```

![clip](https://github.com/maveio/components/assets/238946/a3fd8d44-eb67-401a-b3f9-ecccbc0c15f3)

We often find ourselves using simple `.mp4` files, because we just want to show a simple video as interface element (just like an image). We provide just that, but using the power of mave (multiple renditions, codecs and analytics) without any UI on top to control the video. Useful as header, or on an e-commerce site to show products for instance.

### List

```html
<mave-list token="<token>">
  <template>
    <div slot="item-title"></div>
    <mave-img></mave-img>
  </template>
</mave-list>
```

<img width="894" alt="Screenshot 2023-05-22 at 15 37 55" src="https://github.com/maveio/components/assets/238946/aa7b04e0-01f1-4ac2-976d-3dfe4157a809">

A more complex example is `<mave-list>`, which can be useful to show a collection of videos. Combined with our `x-mave-pop` attribute, it can become pretty powerful.

[**More can be found on our docs**](https://mave.io/docs/)

## Contributing

### Local development

`npm run start`

### Localization

When defining `msg()` run the following command: `./node_modules/.bin/lit-localize extract && ./node_modules/.bin/lit-localize build`
