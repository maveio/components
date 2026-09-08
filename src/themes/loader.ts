import { css, html, LitElement } from 'lit';

import { potentialDistFolder } from '../utils/origin';

interface Theme {
  name: string;
}

type ThemeModule = {
  build: (
    name: string,
    element: typeof LitElement,
    strings: typeof html,
    styles: typeof css,
  ) => void | Promise<void>;
};

const bundledThemeLoaders: Record<string, () => Promise<ThemeModule>> = {
  default: () => import('./default'),
  synthwave: () => import('./synthwave'),
  dolphin: () => import('./dolphin'),
};

async function loadBundledTheme(name: string): Promise<ThemeModule> {
  const distFolder = potentialDistFolder();

  if (!distFolder) return bundledThemeLoaders[name]();

  const url = new URL(`./${distFolder}themes/${name}.js`, import.meta.url);
  return importExternalModule(url.href);
}

async function importExternalModule(modulePath: string): Promise<ThemeModule> {
  return import(
    /* webpackIgnore: true */
    /* @vite-ignore */
    modulePath
  );
}

export class ThemeLoader {
  private static themes = new Map<string, Promise<Theme>>();
  private static externalNames = new Map<string, string>();
  private static stylesheets = new Map<string, HTMLLinkElement>();
  private static nextExternalName = 0;

  public static async get(value: string, path?: string): Promise<Theme> {
    const name = value.trim() || 'default';

    // Known names always select the bundled theme, regardless of the space CDN.
    if (Object.prototype.hasOwnProperty.call(bundledThemeLoaders, name)) {
      return this.load(`bundled:${name}`, async () => {
        if (!customElements.get(`theme-${name}`)) {
          await this.build(name, await loadBundledTheme(name));
        }
        return { name };
      });
    }

    // Preserve custom themes stored by name on the space CDN. All other values
    // are URLs, resolved against the embedding page (including its <base> tag).
    if (path && /^[a-zA-Z0-9_-]+$/.test(name)) {
      return this.external(`${path.replace(/\/$/, '')}/${name}.js`);
    }

    return this.external(name);
  }

  public static async external(path: string): Promise<Theme> {
    const url = new URL(path, document.baseURI);
    url.hash = '';

    const theme = await this.load(url.href, async () => {
      let name = this.externalNames.get(url.href);

      if (!name) {
        // Filenames are neither unique nor necessarily valid custom element names.
        do {
          name = `external-${++this.nextExternalName}`;
        } while (customElements.get(`theme-${name}`));
        this.externalNames.set(url.href, name);
      }

      if (!customElements.get(`theme-${name}`)) {
        await this.build(name, await importExternalModule(url.href));
      }

      return { name };
    });

    this.loadStylesheet(url);
    return theme;
  }

  private static load(key: string, loader: () => Promise<Theme>): Promise<Theme> {
    const cached = this.themes.get(key);
    if (cached) return cached;

    // Share pending work as well as successful loads. Failed loads can be retried.
    const pending = Promise.resolve()
      .then(loader)
      .catch((error) => {
        this.themes.delete(key);
        throw error;
      });
    this.themes.set(key, pending);
    return pending;
  }

  private static async build(name: string, module: ThemeModule): Promise<void> {
    if (typeof module.build !== 'function') {
      throw new Error('[mave-player]: theme must export a build function');
    }

    await module.build(name, LitElement, html, css);

    if (!customElements.get(`theme-${name}`)) {
      throw new Error('[mave-player]: theme did not register its custom element');
    }
  }

  private static loadStylesheet(moduleURL: URL): void {
    const url = new URL(moduleURL.href);
    url.pathname = /\.m?js$/i.test(url.pathname)
      ? url.pathname.replace(/\.m?js$/i, '.css')
      : `${url.pathname}.css`;
    if (this.stylesheets.has(url.href)) return;

    // Optional companion CSS is used for fonts outside the theme's shadow root.
    // Preserve query parameters and never hold up the controls waiting for fonts.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url.href;
    link.onerror = () => {
      link.remove();
      this.stylesheets.delete(url.href);
    };
    this.stylesheets.set(url.href, link);
    document.head.appendChild(link);
  }
}
