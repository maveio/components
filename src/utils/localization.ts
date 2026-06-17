import { configureLocalization, localized, msg } from '@lit/localize';
import type { LocaleModule } from '@lit/localize/internal/types.js';
import { ReactiveControllerHost } from 'lit';

import { potentialDistFolder } from '../utils/origin';
export { localized, msg };

type SupportedLocale = 'en' | 'nl' | 'de' | 'fr';
const SOURCE_LOCALE = 'default';

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

async function loadFromDist(locale: string): Promise<LocaleModule | null> {
  const base = potentialDistFolder();
  if (!base || typeof base !== 'string') return null;

  try {
    // When the bundle is consumed directly from "dist", the generated locale
    // files sit alongside the compiled chunks. Resolve the path relative to
    // the current module at runtime to support that scenario.
    const href = new URL(
      `./${base}generated/locales/${locale}.js`,
      import.meta.url,
    ).href;
    if (!href || href.endsWith('/undefined')) return null;

    return (await import(/* @vite-ignore */ href)) as LocaleModule;
  } catch (err) {
    return null;
  }
}

export const localization = configureLocalization({
  sourceLocale: SOURCE_LOCALE,
  targetLocales: ['en', 'nl', 'de', 'fr'],
  loadLocale: async (locale) => {
    if (potentialDistFolder()) {
      const distModule = await loadFromDist(locale);
      if (distModule) {
        return distModule;
      }
    }

    const loader = resolveLoader(locale);

    if (loader) {
      try {
        return (await loader()) as LocaleModule;
      } catch (err) {
        console.error(`[mave-player]: failed to load locale ${locale}`, err);
      }
    }

    const distModule = await loadFromDist(locale);
    if (distModule) {
      return distModule;
    }

    console.log(`[mave-player]: locale not loaded for ${locale}`);
    throw new Error(`[mave-player]: failed to load locale ${locale}`);
  },
});

let localizationReady = true;

export class LanguageController {
  private host: ReactiveControllerHost;
  private _locale: string;

  get loaded() {
    return localizationReady;
  }

  _onLoad = (event: CustomEvent) => {
    if (event.detail.status === 'loading') {
      localizationReady = false;
    } else if (event.detail.status === 'ready' || event.detail.status === 'error') {
      localizationReady = true;
    }
    this.host.requestUpdate();
  };

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  set locale(value: string | undefined) {
    const locale = value || SOURCE_LOCALE;

    if (this._locale !== locale) {
      try {
        void localization
          .setLocale(locale)
          .then(() => {
            this._locale = locale;
          })
          .catch((err) => {
            console.error(`[mave-player]: failed to set locale ${locale}`, err);
          });
      } catch (err) {
        console.error(`[mave-player]: failed to set locale ${locale}`, err);
      }

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
