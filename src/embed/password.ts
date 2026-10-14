import { html, type ReactiveController, type ReactiveControllerHost } from 'lit';

import { Config } from '../config';
import { msg } from '../utils/localization';
import { playerMessage } from '../utils/player-message';

type PasswordHost = HTMLElement &
  ReactiveControllerHost & { embed: string; token: string; locale?: string };

/** Authorization belongs to this player instance only; it is never reflected or persisted. */
export class PasswordPlayback implements ReactiveController {
  protected = false;
  busy = false;
  error?: string;
  #token = '';
  private generation = 0;
  private request?: AbortController;

  constructor(
    private host: PasswordHost,
    private authorize: (token: string) => void,
  ) {
    host.addController(this);
  }

  get token() {
    return this.#token;
  }

  reset() {
    this.generation++;
    this.request?.abort();
    this.#token = '';
    this.protected = false;
    this.busy = false;
    this.error = undefined;
  }

  hostDisconnected() {
    this.reset();
  }

  private url(embed: string, action: string) {
    return `${Config.api.endpoint.replace(/\/$/, '')}/playback/${encodeURIComponent(embed)}/${action}`;
  }

  async checkAccess(embed: string) {
    if (
      this.host.token ||
      this.#token ||
      embed !== this.host.embed ||
      !this.host.isConnected
    )
      return;
    const generation = this.generation;
    this.request?.abort();
    this.request = new AbortController();
    try {
      const response = await fetch(this.url(embed, 'access'), {
        signal: this.request.signal,
        credentials: 'omit',
        cache: 'no-store',
      });
      const data = response.ok ? await response.json() : undefined;
      if (generation !== this.generation || embed !== this.host.embed || this.host.token)
        return;
      this.protected = data?.password_protected === true;
      this.host.requestUpdate();
    } catch {
      /* A failed access lookup keeps the existing player error state. */
    }
  }

  private submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (this.busy || this.host.token || !this.protected) return;
    const form = event.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem('password') as HTMLInputElement;
    const password = input.value;
    if (!password) {
      input.focus();
      return;
    }
    input.value = '';
    const embed = this.host.embed;
    const generation = this.generation;
    this.busy = true;
    this.error = undefined;
    this.host.requestUpdate();
    this.request?.abort();
    this.request = new AbortController();
    try {
      const response = await fetch(this.url(embed, 'password-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'omit',
        cache: 'no-store',
        signal: this.request.signal,
      });
      const data = await response.json();
      if (
        generation !== this.generation ||
        embed !== this.host.embed ||
        this.host.token ||
        !this.host.isConnected
      )
        return;
      if (response.ok && typeof data.token === 'string' && data.token) {
        this.#token = data.token;
        this.protected = false;
        this.authorize(this.#token);
      } else if (response.status === 401) {
        this.error = playerMessage(
          msg('Incorrect password. Try again.', { id: 'passwordIncorrect' }),
          'passwordIncorrect',
          this.host.locale,
        );
      } else if (response.status === 409) {
        this.error = playerMessage(
          msg('Video protection is still being applied. Please try again shortly.', {
            id: 'passwordPending',
          }),
          'passwordPending',
          this.host.locale,
        );
      } else if (response.status === 429) {
        this.error = playerMessage(
          msg('Too many attempts. Please wait a minute.', { id: 'passwordRateLimited' }),
          'passwordRateLimited',
          this.host.locale,
        );
      } else {
        this.error = playerMessage(
          msg('Unable to unlock this video. Please try again.', {
            id: 'passwordUnavailable',
          }),
          'passwordUnavailable',
          this.host.locale,
        );
      }
    } catch {
      if (generation === this.generation)
        this.error = playerMessage(
          msg('Unable to unlock this video. Please try again.', {
            id: 'passwordUnavailable',
          }),
          'passwordUnavailable',
          this.host.locale,
        );
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.host.requestUpdate();
        if (this.error) {
          await this.host.updateComplete;
          if (generation === this.generation && this.host.isConnected)
            input.focus({ preventScroll: true });
        }
      }
    }
  };

  render() {
    return html`<form
      id="password-form"
      class="password-panel"
      @submit=${this.submit}
      aria-busy=${this.busy}
    >
      <label for="playback-password"
        >${playerMessage(msg('Enter the video password', { id: 'passwordLabel' }), 'passwordLabel', this.host.locale)}</label
      >
      <input
        id="playback-password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
        ?disabled=${this.busy}
        aria-describedby="password-error"
        aria-invalid=${!!this.error}
      />
      <button type="submit" ?disabled=${this.busy}>
        ${
          this.busy
            ? playerMessage(
                msg('Unlocking…', { id: 'passwordLoading' }),
                'passwordLoading',
                this.host.locale,
              )
            : playerMessage(
                msg('Unlock video', { id: 'passwordSubmit' }),
                'passwordSubmit',
                this.host.locale,
              )
        }
      </button>
      <p id="password-error" role="alert" aria-live="polite">${this.error ?? ''}</p>
    </form>`;
  }
}
