# Password player

Branch: `feat/password-player`. Dependencies: Components `feat/player-seo` and
`feat/sticky-player`; Core `feat/password-playback`. No client migration.

A failed public manifest load discovers the minimal access signal. Protected
videos render an accessible localized form, with pending protection, wrong
password, rate-limit and network feedback. Successful authorization resumes the
existing private playback path. Explicit caller tokens win; internally obtained
tokens exist only in memory and are discarded on embed changes/disconnect.
Outdated access/token requests and A → B → A manifest responses cannot modify the
current video. A late access response also cannot replace a newly refreshed public player. Token URLs are not logged. No new storage refresh mechanism exists.

JSON-LD now requires an explicitly recorded successful public manifest load;
private metadata cannot escape on reconnect, even when the manifest contains no
privacy flags. The sticky observer reconnects when the password form replaces its
anchor. New controls resolve explicit locales per player, avoiding global Lit
locale contention between multiple players. Keyboard errors restore input focus
after re-enabling it; successful authorization focuses the loaded media.

Validation:

- Typecheck passed.
- Vitest: 9 files, 45 tests passed, including races, token precedence, reconnect,
  no extra public access request, audio inheritance, localized forms and focus.
- Production build and package tests passed (4 package tests).
- Edited source files pass lint. Full lint retains 74 pre-existing findings,
  compared with 91 on clean main using the same dependencies and configuration.
- Browser checks using the production bundle, a synthetic local HTTP fixture and
  generated MP4: Enter submits; wrong passwords show feedback; a correct password
  loads playback; Dutch labels remain Dutch next to an English player; desktop
  sticky preserves a 360px original footprint while displaying a 360px-wide
  floating surface; Escape suppresses re-entry; mobile 390px disables floating
  unless sticky-mobile is supplied; pausing restores normal layout.
- Fullscreen/PiP and delayed network behavior are covered by deterministic DOM
  tests; no real external protected-media service was accessed for browser QA.

The Core companion branch separately validates real object-storage denial,
password revision/expiry/scope, cache policy and existing SaaS adapter behavior.
No pushes, pull requests, deployments or package publication.
