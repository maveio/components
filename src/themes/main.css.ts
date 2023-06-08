import { css } from 'lit';

export default css`
  :host {
    display: flex;
    -webkit-font-smoothing: antialiased;
    aspect-ratio: var(--aspect-ratio, 16 / 9);
  }

  media-controller {
    width: var(--width, 100%);
    height: var(--height);
    aspect-ratio: var(--aspect-ratio, 16 / 9);
    margin: 0;
    padding: 0;

    --media-background-color: transparent;

    --media-icon-color: transparent;

    --media-control-background: transparent;
    --media-control-hover-background: transparent;

    --media-range-track-height: 1px;
    --media-range-track-background: rgba(255, 255, 255, 0.1);
    --media-range-track-pointer-background: rgba(255, 255, 255, 0.25);

    --media-range-thumb-background: transparent;
    --media-range-thumb-width: 20px;
    --media-range-thumb-height: 20px;

    --media-range-thumb-transform: scale(0);

    --media-range-thumb-transition: transform 100ms cubic-bezier(0.4, 0, 0.2, 1);

    --media-preview-time-margin: 0;

    --media-listbox-selected-background: rgba(0, 0, 0, 0.2);
    --media-listbox-hover-background: rgba(0, 0, 0, 0.3);
  }

  media-loading-indicator {
    --media-icon-color: rgba(255, 255, 255, 1);
  }

  media-controller[media-is-fullscreen] {
    aspect-ratio: auto;
  }

  media-control-bar {
    display: var(--media-control-bar-display, flex);
    position: relative;
    margin: 0;
    padding: 0 6px 2px 4px;
  }

  .small-button {
    position: relative;
    flex: none;
    display: flex;
    height: 48px;
    width: 48px;
    opacity: 0.95;
    transition-property: transform;
    transform-origin: center;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 100ms;
  }

  .small-button:hover {
    opacity: 1;
    transform: scale(1.25);
  }

  .small-button svg {
    position: absolute;
    overflow: hidden;
    width: 100%;
    height: 25px;
    margin: 0 !important;
    padding: 0 !important;
    transform: translate3d(var(--tw-translate-x), var(--tw-translate-y), 0)
      rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y))
      scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
  }

  media-play-button.small-button svg {
    --media-icon-color: white;
  }

  media-mute-button.small-button svg {
    height: 28px;
  }

  media-captions-listbox {
    position: absolute;
    width: 8rem;
    right: 2.55rem;
    bottom: 3.1rem;
  }

  media-captions-listbox::part(listitem) {
    border-radius: 4px;
    font-family: Sofia, sans-serif;
    letter-spacing: 0.005rem;
    opacity: 0.9;
    font-size: 1rem;
    text-align: center;
    padding: 0.25rem;
  }

  /* media-captions-listbox::part(listitem):hover,
  media-captions-listbox::part(listitem)[aria-selected='true']:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  media-captions-listbox::part(listitem)[aria-selected='true'] {
    font-weight: 600;
    background: transparent;
    text-decoration: underline;
  } */

  media-loading-indicator {
    flex: none;
    display: none;
    height: 48px;
    width: 48px;
  }

  media-loading-indicator svg {
    height: 28px;
  }

  media-controller[medialoading]:not([mediapaused]) div[slot='centered-chrome'] {
    background-color: transparent;
  }

  div[slot='centered-chrome'] media-loading-indicator {
    width: 72px;
    height: 72px;
  }

  div[slot='centered-chrome'] media-loading-indicator svg {
    width: 80px;
    height: 80px;
  }

  media-loading-indicator[medialoading]:not([mediapaused]) {
    display: flex;
  }

  media-controller[medialoading]:not([mediapaused]) media-play-button {
    display: none;
  }

  media-fullscreen-button.small-button svg {
    height: 24px;
  }

  media-time-range {
    height: 48px;
    margin: 0 -8px 0 -2px;
    opacity: 0.5;
  }

  media-time-range:hover {
    opacity: 1;
    --media-range-thumb-transform: scale(1);
    --media-range-thumb-background: #fff;
  }

  media-time-range span {
    margin-bottom: -20px;
  }

  media-volume-range {
    height: 100%;
    --media-range-thumb-width: 16px;
    --media-range-thumb-height: 16px;
    --media-range-thumb-background: #fff;
    --media-range-thumb-transform: scale(1);
  }

  media-volume-range:hover {
    height: 100%;
    --media-range-thumb-width: 16px;
    --media-range-thumb-height: 16px;
  }

  media-time-display {
    margin: 0 0 0 -8px;
    padding: 0 !important;
    min-width: 56px;
  }

  media-time-display,
  media-preview-time-display {
    letter-spacing: 0.005rem;
    opacity: 0.9;
    font-size: 14px;
    font-family: Sofia, sans-serif;
  }

  media-preview-time-display {
    display: none;
  }

  .mave-gradient-bottom {
    display: var(--media-control-bar-display, flex);
    position: absolute;
    width: 100%;
    height: 50px;
    bottom: 0;
    pointer-events: none;
    background: var(
      --primary-color,
      linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 100%)
    );
  }

  div[slot='centered-chrome'] {
    display: var(--big-button-display, none);
    justify-content: center;
    align-items: center;
    border-radius: 1000px;
    background-color: var(--primary-color);
    padding: 12px;
  }

  div[slot='centered-chrome'] media-play-button {
    width: 72px;
    height: 72px;
    --media-icon-color: white;
  }

  div[slot='centered-chrome'] media-play-button svg {
    width: 80px;
    height: 80px;
    text: white;
  }

  div[slot='top-chrome'] {
    width: 100%;
    display: flex;
    padding: 0;
    flex-direction: row-reverse;
  }

  div[slot='top-chrome'] .small-button {
    margin: 7px;
  }

  .media-volume-wrapper {
    position: relative;
    padding-left: 6px;
  }

  .media-volume-range-wrapper {
    width: 122px;
    height: 34px;
    overflow: hidden;
    opacity: 0;
    transform: rotate(-90deg);
    position: absolute;
    top: -70px;
    left: -40px;
    border-left: 16px solid transparent;
  }

  media-volume-range {
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.5);
    --media-range-track-width: 80px;
  }

  media-mute-button:hover + .media-volume-range-wrapper,
  media-mute-button:focus + .media-volume-range-wrapper,
  media-mute-button:focus-within + .media-volume-range-wrapper,
  .media-volume-range-wrapper:hover,
  .media-volume-range-wrapper:focus,
  .media-volume-range-wrapper:focus-within {
    opacity: 1;
  }

  media-airplay-button[media-airplay-unavailable].small-button {
    display: none;
  }

  media-cast-button[media-cast-unavailable].small-button {
    display: none;
  }

  media-pip-button[media-pip-unavailable].small-button {
    display: none;
  }

  media-captions-button {
    margin-right: -0.15rem;
  }

  media-captions-button.small-button {
    display: none;
  }

  media-captions-button[mediacaptionlist].small-button {
    display: flex;
  }

  media-captions-button[mediasubtitleslist].small-button {
    display: flex;
  }
`;
