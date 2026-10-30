# Player structured metadata

Branch: `feat/player-seo`; base: Components main `7397669`.

Public video players publish one adjacent JSON-LD VideoObject from the loaded manifest. `seo="off"` disables it. Tokens, protected manifests and audio players suppress metadata. Disconnect and embed/token changes remove the script; stale manifest responses cannot restore it. Metadata contains only existing public fields and excludes signed media URLs.

Dependencies: none. Migrations: none. No Core description field is introduced.

Validation (local): typecheck passed; Vitest passed (7 files, 26 tests); production build passed; package tests passed (4 tests). Full lint reports 76 existing errors, compared with 91 on the clean main baseline using the same dependencies/configuration. Changed player and SEO helper pass lint; the controller retains two pre-existing lint findings. Formatting fixes are limited to edited files. Browser search-engine indexing is outside these tests.
