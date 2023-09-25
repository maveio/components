import { configureLocalization, localized, msg } from '@lit/localize';
import { ReactiveControllerHost } from 'lit';
export { localized, msg };

export const localization = configureLocalization({
  sourceLocale: 'default',
  targetLocales: ['en', 'nl', 'de', 'fr'],
  // eslint-disable-next-line
  // @ts-ignore-next-line
  loadLocale: (locale) => import(import.meta.resolve(`./generated/locales/${locale}.js`)),
});

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
