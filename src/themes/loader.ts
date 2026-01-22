import { css, html, LitElement } from 'lit';

import { potentialDistFolder } from '../utils/origin';

interface Theme {
  name: string;
}

const defaults = ['default', 'synthwave', 'dolphin'];

type ThemeModule = {
  build: (
    name: string,
    element: typeof LitElement,
    strings: typeof html,
    styles: typeof css,
  ) => void;
};

const bundledThemeLoaders: Record<string, () => Promise<ThemeModule>> = {
  default: () => import('./default'),
  synthwave: () => import('./synthwave'),
  dolphin: () => import('./dolphin'),
};

async function loadBundledTheme(name: string): Promise<ThemeModule | undefined> {
  if (!defaults.includes(name)) return undefined;

  const useDistFolder = Boolean(potentialDistFolder());
  if (useDistFolder) {
    const themePath = `./dist/themes/${name}.js`;
    return importExternalModule(themePath);
  }

  const loader = bundledThemeLoaders[name];
  return loader ? loader() : undefined;
}

async function importExternalModule(modulePath: string): Promise<ThemeModule> {
  return import(
    /* webpackIgnore: true */
    /* @vite-ignore */
    modulePath
  );
}

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

    if (ThemeLoader.instance.themes.find((theme) => theme.name === name)) {
      ThemeLoader.instance.currentTheme = name;
      return Promise.resolve(ThemeLoader.instance);
    }

    // Add to cache instantaneously to make sure it doesn't load again
    ThemeLoader.instance.themes.push({ name });

    // set current theme name
    ThemeLoader.instance.currentTheme = name;

    try {
      if (typeof document !== 'undefined' && !defaults.includes(name)) {
        // Inject css for font (Chrome issue)
        const fontCSS = document.createElement('link');
        fontCSS.rel = 'stylesheet';
        fontCSS.href = `${path}/${name}.css`;
        document.head.appendChild(fontCSS);
      }
    } catch (e) {
      console.log('[mave-player]: theme css not loaded', e);
    }

    try {
      if (path && !defaults.includes(name)) {
        const { build } = await importExternalModule(`${path}/${name}.js`);
        build(name, LitElement, html, css);
      } else {
        const bundledTheme = await loadBundledTheme(name);

        if (bundledTheme) {
          bundledTheme.build(name, LitElement, html, css);
        } else {
          const themePath = `./${potentialDistFolder()}themes/${name}.js`;
          const { build } = await importExternalModule(themePath);
          build(name, LitElement, html, css);
        }
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

    try {
      if (typeof document !== 'undefined') {
        // Inject css for font (Chrome issue)
        const fontCSS = document.createElement('link');
        fontCSS.rel = 'stylesheet';
        fontCSS.href = `${path.replace('.js', '')}.css`;
        document.head.appendChild(fontCSS);
      }
    } catch (e) {
      console.log('[mave-player]: theme css not loaded', e);
    }

    if (ThemeLoader.instance.themes.find((theme) => theme.name === name)) {
      ThemeLoader.instance.currentTheme = name;
      return Promise.resolve(ThemeLoader.instance);
    }

    // Add to cache instantaneously to make sure it doesn't load again
    ThemeLoader.instance.themes.push({ name });

    // set current theme name
    ThemeLoader.instance.currentTheme = name;

    try {
      const { build } = await importExternalModule(path);
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
