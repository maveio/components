import { css, html, LitElement } from 'lit';

import { build as defaultBuild } from './default.js';

interface Theme {
  name: string;
}

const defaults = ['default'];

export class ThemeLoader {
  private static instance: ThemeLoader;
  private themes: Array<Theme> = [];

  private constructor() {
    return;
  }

  public static async get(
    name: string,
    path?: string,
    injectCSS = true,
  ): Promise<ThemeLoader> {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }

    if (ThemeLoader.instance.themes.find((theme) => theme.name === name))
      return Promise.resolve(ThemeLoader.instance);

    // Add to cache instantaneously to make sure it doesn't load again
    ThemeLoader.instance.themes.push({ name });

    try {
      if (injectCSS && !defaults.includes(name)) {
        // Inject css for font (Chrome issue)
        const fontCSS = document.createElement('link');
        fontCSS.rel = 'stylesheet';
        fontCSS.href = `${path}/${name}.css`;
        document.head.appendChild(fontCSS);
      }

      if (path && !defaults.includes(name)) {
        const { build } = await import(`${path}/${name}.js`);
        build(name, LitElement, html, css);
      } else {
        // fix cdn routing first before enabling dynamic import from package
        // const { build } = await import(`./themes/${name}.js`);
        defaultBuild(name, LitElement, html, css);
      }
    } catch (e) {
      console.log(e);
    }

    return Promise.resolve(ThemeLoader.instance);
  }
}
