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

## Usage

### Player

Once you have uploaded your first video you can show your videos in different formats. The most common used component is `<mave-player>`:

```html
<mave-player embed="{embed id}"></mave-player>
```

![player](https://github.com/maveio/components/assets/238946/bbf3a4d2-7172-4bfb-8b24-0f863492a5e5)

You can either change the settings through our interface or provide it as attributes. To learn which attributes you can use to change the appearance of your player, go to [our docs](https://docs.mave.io).

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
