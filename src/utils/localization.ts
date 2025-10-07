import { configureLocalization, localized, msg } from '@lit/localize';
import { ReactiveControllerHost } from 'lit';

import { potentialDistFolder } from '../utils/origin';
export { localized, msg };

type SupportedLocale = 'en' | 'nl' | 'de' | 'fr';

// Bundlers need explicit references to locale modules so they are included
// in the output chunks. Keep this mapping in sync with `targetLocales`.
const localeLoaders: Record<SupportedLocale, () => Promise<unknown>> = {
  en: () => import('../generated/locales/en.js'),
  nl: () => import('../generated/locales/nl.js'),
  de: () => import('../generated/locales/de.js'),
  fr: () => import('../generated/locales/fr.js'),
};

function resolveLoader(locale: string) {
  const normalized = locale as SupportedLocale;
  return localeLoaders[normalized];
}

async function loadFromDist(locale: string) {
  const base = potentialDistFolder();
  if (!base) return null;

  try {
    // When the bundle is consumed directly from "dist", the generated locale
    // files sit alongside the compiled chunks. Resolve the path relative to
    // the current module at runtime to support that scenario.
    const url = new URL(`./${base}generated/locales/${locale}.js`, import.meta.url);
    return await import(/* @vite-ignore */ url.href);
  } catch (err) {
    return null;
  }
}

export const localization = configureLocalization({
  sourceLocale: 'default',
  targetLocales: ['en', 'nl', 'de', 'fr'],
  loadLocale: async (locale) => {
    const loader = resolveLoader(locale);

    if (loader) {
      try {
        return await loader();
      } catch (err) {
        console.error(`[mave-player]: failed to load locale ${locale}`, err);
      }
    }

    const distModule = await loadFromDist(locale);
    if (distModule) {
      return distModule;
    }

    console.log(`[mave-player]: locale not loaded for ${locale}`);
    return null;
  },
});

let loaded = false;

export class LanguageController {
  private host: ReactiveControllerHost;
  private _locale: string;

  get loaded() {
    return loaded;
  }

  _onLoad = (event: CustomEvent) => {
    if (event.detail.status === 'loading') {
      loaded = false;
    } else if (event.detail.status === 'ready') {
      loaded = true;
    }
    this.host.requestUpdate();
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  set locale(value: string) {
    if (this._locale !== value) {
      localization.setLocale(value);
      this.host.requestUpdate();
    }
  }

  get locale() {
    return this._locale;
  }

  hostConnected() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lit-localize-status', this._onLoad);
    }
  }

  hostDisconnected() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('lit-localize-status', this._onLoad);
    }
  }
}
