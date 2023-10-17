import { configureLocalization, localized, msg } from '@lit/localize';
import { ReactiveControllerHost } from 'lit';
import { potentialDistFolder } from '../utils/origin';
export { localized, msg };

export const localization = configureLocalization({
  sourceLocale: 'default',
  targetLocales: ['en', 'nl', 'de', 'fr'],
  loadLocale: (locale) =>
    import(`./${potentialDistFolder()}generated/locales/${locale}.js`),
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
    window.addEventListener('lit-localize-status', this._onLoad);
  }

  hostDisconnected() {
    window.removeEventListener('lit-localize-status', this._onLoad);
  }
}
