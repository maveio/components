import { configureLocalization, localized, msg } from '@lit/localize';
export { localized, msg };

export const localization = configureLocalization({
  sourceLocale: 'default',
  targetLocales: ['en', 'nl', 'de', 'fr'],
  loadLocale: (locale) => import(`./generated/locales/${locale}.js`),
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
    if (this._locale != value) {
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
