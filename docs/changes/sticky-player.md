# Sticky mini-player

Branch: `feat/sticky-player`; depends on `feat/player-seo`. Migrations: none.

Adds optional bottom-left/right floating video playback, with a separate observer
on the original footprint and an unchanged media DOM. Mobile requires opt-in.
Pause, scrolling back, fullscreen and PiP restore the normal layout. Dismissal
persists only in this player instance's memory, including embed changes. The
localized close control restores focus to the media; Escape dismisses floating
players. Reduced motion disables the entry animation.

Validation: typecheck passed; Vitest passed (8 files, 31 tests), including mobile
media queries, separate observers, multiple players, keyboard dismissal, focus,
fullscreen/PiP, resetting and cleanup. Production build and package tests passed
(4 tests). Full lint retains the 76 baseline findings documented in player-seo;
the changed player and sticky controller pass lint. DOM tests use Happy DOM, so
real-browser visual positioning remains a manual check.
