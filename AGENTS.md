# Mave Components

Public `@maveio/components` browser-component package. Read [README.md](README.md)
for usage and [package.json](package.json) for the available development commands.

## Working rules

- Check `git status --short` before editing. Preserve unrelated changes and
  local work. Do not create or amend commits unless the user requests it.
- Deliver changes on a task branch through a pull request; never push directly
  to the default branch. A request to deliver a PR authorizes the commits and
  branch push needed for that PR. Merging and releasing require separate
  authorization. Name feature branches `feat/...` and fixes `fix/...`.
- Before updating a pull request, fetch `origin` and rebase the task branch onto
  `origin/main` instead of merging `main` into it. Rebase only task-owned commits;
  preserve unrelated work and use a separate worktree if the checkout is dirty.
  Update a published task branch with `--force-with-lease`, never plain `--force`,
  after verifying that its remote head has not changed unexpectedly.
- Use English for code comments, documentation, branches and pull requests.
- Treat source, tests, documentation and PRs as public material. Do not include
  customer identifiers, production observations, private roadmap details,
  infrastructure identities, secrets, tokens or signed URLs. Use synthetic
  examples and fixtures that can be shared publicly.
- Use `rg` for searches; exclude `node_modules`, `dist`, `lib` and generated
  artifacts unless those directories are the subject of the task.
- Do not restart a running development environment or use production data to
  validate a change. Use dedicated test services and synthetic fixtures.

## Changes and validation

- Prefer small, behavior-focused changes with deterministic tests near the code.
- Preserve public custom-element names, attributes, properties, events, slots,
  configuration and package exports. Call out intentional compatibility changes.
- Keep browser capability detection, media fallbacks and lifecycle cleanup
  explicit. Check source changes, disconnection and reconnect behavior when
  changing playback or event listeners.
- Use real browser checks for media behavior that DOM mocks cannot establish.
  Distinguish Chromium, Firefox and WebKit automation from actual Chrome, Edge,
  Safari, iOS simulators and physical devices. Do not claim AirPlay, audio output
  or user-gesture behavior was verified unless it was actually exercised.
- Preserve compatibility with valid older manifests and playlists. A passing
  unit test or a video starting successfully does not prove playback completes.
- Use focused local checks when implementing or debugging a change. First check
  which GitHub Actions workflows cover the relevant revision. Rely on CI for
  checks it actually runs; do not assume release-only workflows validate PRs.
  Run local checks for uncovered behavior or when CI is unavailable.
- Relevant commands are `npm test`, `npm run typecheck`, `npm run lint`,
  `npm run build:prod` and `npm run test:package`. Inspect formatting and lockfile
  changes produced by commands. Do not mix unrelated cleanup into a fix.
- Do not bump package versions, publish npm packages, promote CDN artifacts or
  dispatch release/deployment workflows without explicit authorization.

## Pull request presentation

Write for a contributor who has not read the task conversation. A reader should
understand the problem and the improvement within twenty seconds.

- Use an English title that names the resulting behavior, such as "Keep adaptive
  HLS playback available in Safari". Avoid vague titles and implementation-only
  descriptions when the user-facing effect is clearer.
- Open with one or two plain sentences: what happens today, what changes, and
  why that matters. Follow with two to four concrete bullets when useful.
  Describe the final change, not the sequence of work or a list of edited files.
- Use the repository's PR template when present. Short headings and small
  before/after tables are welcome; avoid decorative noise, oversized headings
  and long checklists. Remove empty or irrelevant sections. Routine PRs should
  usually fit in roughly 100–200 words, excluding media.
- For visible UI or media changes, capture real before/after screenshots. Use a
  short video or GIF when motion or interaction is the point. Label the states,
  keep the viewport and example consistent, and inspect the media before posting.
  Put the preview close to the summary so readers can see the improvement quickly.
- Check the entire frame, browser chrome, filenames and audio for personal data,
  credentials and other confidential information before publishing a preview.
- Attach media where GitHub readers can actually view it. Local filesystem paths
  and inaccessible artifact links are not previews. Never substitute a mockup or
  generated illustration for evidence that the implementation works. If capture
  or attachment is unavailable, state that limitation rather than claiming proof.
- For changes without a visual result, use the smallest helpful example: an API
  request/response, a reproduction or a before/after behavior table. Do not force
  screenshots onto dependency updates or invisible playback-routing changes.
- Let GitHub's Checks tab report routine CI results. Do not repeat its test
  counts, command lists or "CI passed" checklist in the PR body, and do not rerun
  the same suites locally just to write that section.
- Add an optional additional-checks section only for evidence beyond routine CI:
  a manual reproduction, browser/device checks, benchmarks, uncovered local
  checks or a material gap or failure reviewers need to understand. Remove it
  when it adds nothing. Never imply pending checks passed.
- Performance and media-quality claims need a baseline, units, test conditions
  and tradeoffs. Distinguish measured results from expectations and do not imply
  every input or device improves because the tested examples improved.
- Include compatibility or upgrade guidance when package consumers need it.
  Prefer existing public documentation over session journals or duplicate guides.
- Before publishing or updating a PR, read the rendered body, verify media and
  links, and rewrite the title and summary if the final scope has changed.
