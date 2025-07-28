import { css, html, LitElement } from 'lit';

import { potentialDistFolder } from '../utils/origin';

interface Theme {
  name: string;
}

const defaults = ['default', 'synthwave', 'dolphin'];

export class ThemeLoader {
  private static instance: ThemeLoader;
  private themes: Array<Theme> = [];

  // expose current theme name
  public currentTheme: string;

  private constructor() {
    return;
  }

  public static async get(name: string, path?: string): Promise<ThemeLoader> {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }

    if (ThemeLoader.instance.themes.find((theme) => theme.name === name))
      return Promise.resolve(ThemeLoader.instance);

    // Add to cache instantaneously to make sure it doesn't load again
    ThemeLoader.instance.themes.push({ name });

    // set current theme name
    ThemeLoader.instance.currentTheme = name;

    try {
      if (path && !defaults.includes(name)) {
        const { build } = await import(`${path}/${name}.js`);
        build(name, LitElement, html, css);
      } else {
        const themePath = `./${potentialDistFolder()}themes/${name}.js`;
        const { build } = await import(themePath);
        build(name, LitElement, html, css);
      }
    } catch (e) {
      console.log('[mave-player]: theme not loaded', e);
    }

    return Promise.resolve(ThemeLoader.instance);
  }

  public static async external(path: string): Promise<ThemeLoader> {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }

    // get name from path
    const name = path.split('/').pop()?.replace('.js', '') || '';

    if (ThemeLoader.instance.themes.find((theme) => theme.name === name))
      return Promise.resolve(ThemeLoader.instance);

    // Add to cache instantaneously to make sure it doesn't load again
    ThemeLoader.instance.themes.push({ name });

    // set current theme name
    ThemeLoader.instance.currentTheme = name;

    try {
      const { build } = await import(path);
      build(name, LitElement, html, css);
    } catch (e) {
      console.log('[mave-player]: theme not loaded', e);
    }

    return Promise.resolve(ThemeLoader.instance);
  }

  public static getTheme(): string {
    return ThemeLoader.instance ? ThemeLoader.instance.currentTheme : '';
  }
}
