import { configureLocalization, LocaleModule, localized, msg } from '@lit/localize';
export { localized, msg };

import * as templates_de from '../generated/locales/de';
import * as templates_en from '../generated/locales/en';
import * as templates_fr from '../generated/locales/fr';
import * as templates_nl from '../generated/locales/nl';

const localizedTemplates = new Map([
  ['de', templates_de as LocaleModule],
  ['en', templates_en as LocaleModule],
  ['fr', templates_fr as LocaleModule],
  ['nl', templates_nl as LocaleModule],
]);

export const localization = configureLocalization({
  sourceLocale: 'default',
  targetLocales: ['en', 'nl', 'de', 'fr'],
  loadLocale: async (locale) => {
    const template = localizedTemplates.get(locale);
    if (template) {
      return template;
    }
    throw new Error(`Could not load locale data for "${locale}"`);
  },
});

import { ReactiveControllerHost } from 'lit';

export class LanguageController {
  private host: ReactiveControllerHost;
  private _locale: string;
  loaded = false;

  _onLoad = (event: CustomEvent) => {
    if (event.detail.status === 'loading') {
      this.loaded = false;
    } else if (event.detail.status === 'ready') {
      this.loaded = true;
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
    window.addEventListener('lit-localize-status', this._onLoad);
  }

  hostDisconnected() {
    window.removeEventListener('lit-localize-status', this._onLoad);
  }
}
