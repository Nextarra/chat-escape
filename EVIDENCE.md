# Verification evidence — 2026-10-29 UTC — presentation revision

A working standalone Chat Escape prototype is ready for local evaluation and an authorized live integration test. It is not a completed live Twitch submission. No first-prize likelihood or exhaustive defect-elimination claim is made.

## Measured results

| Check | Observed result | Artifact |
| --- | --- | --- |
| Node automated suite | 49 passed, 0 failed | `evidence/unit-tests.txt` |
| Browser full flow (creator environment) | 13 passed checks, no uncaught exceptions; Chromium 154.0.8037.57; 22.539 seconds | `evidence/browser-results.json` |
| Dedicated HUD/mobile | 19 passed, 0 failed; six WCAG-tagged scans with zero violations and explicit contrast review items | `evidence/polish-browser-results.json` |
| Deterministic recovery | 18 synthetic actions; WON; 12 accepted, 1 duplicate blocked, 2 rejected; identical replayed state; 2.027ms | `evidence/replay-results.json` |
| Vote invariant | All 27 three-team combinations checked; only jointly correct votes advance | `test/invariants.test.js` |
| Paused hostile flood | 500 seeded inputs; no gameplay mutation or hostile text retained | `test/invariants.test.js` |
| Small persistence benchmark | 500 synthetic joins accepted; 193.62ms total; mean 0.387ms/command | `evidence/load-results.json` |
| Screenshots | Controller desktop/mobile plus ready, alignment, charge, pause and victory HUD at 1280/1920; all fixture mode | `evidence/01-*.png` through `11-*.png` |
| Source extraction | Tests, replay and actual CLI HTTP startup without runtime package installation | `evidence/clean-room.txt` |

Timings describe one cloud-machine sample, not sustained capacity. No real Twitch latency, audience behavior or OBS rendering measurements exist. Accessibility checks cover labels, language, focus order, touch targets, live status, reduced motion, mobile overflow and automated WCAG-tagged scans. Axe contrast review items are retained alongside supplementary computed ratios; full conformance is not certified. See `POLISH_REVIEW.md`.

## Presentation revision — 2026-10-29

The spectator route now has its own 16:9 HUD rather than the controller page with controls hidden. It fits 1280×720 and 1920×1080, exposes large next commands and a server-driven countdown, and letterboxes in wider windows. An original CSS portal opens into a clearly different shared victory scene with reduced-motion support. Mobile join/current commands and sticky streamer controls are above the fold. `POLISH_REVIEW.md` documents the six inspected states and exact evidence limits. No engine or authorization expansion is included.

## Review regressions — 2026-10-29

An independent review reproduced the original 32 tests and synthetic replay, then found two missed defects. Both were confirmed locally using the new targeted regression tests against the unchanged version-0 archive: **0 passed / 2 failed**. The same targeted tests on this revision: **2 passed / 0 failed**. See `evidence/review-regression-before.txt` and `evidence/review-regression-after.txt`.

1. A deferred subscription result for closed socket 1 could promote it after socket 2 had connected, close healthy socket 2, and falsely report connected. Socket contexts now carry lifecycle and generation checks before/after async work. Closed/superseded completions and failures are ignored; subscriptions are aborted on retirement. Only the current candidate can activate, and only the active socket can deliver chat, revocation or reconnect messages.
2. Charges at event times **100000, 101000, 80000** could win over a 21,000ms span. Accepted command event times now have a monotonic floor. Charge ages must be nonnegative and at most 12,000ms, and future charges render inactive with zero seconds. Future packets and packets older than two minutes are rejected at ingress; receive times are recorded for deterministic replay.

Fifteen additional automated cases cover those reproductions and surrounding stale failure, readyState-before-close-event, stop/restart, duplicate welcome, pre-welcome chat, stale watchdog/reconnect, failed migration, all six out-of-order arrival permutations, 12,000/12,001ms boundaries, clock rollback, future/stale time, delayed pre-resume packets and exact reset/resume milliseconds. Conservative rejection at temporal boundaries can drop a legitimate delayed/clock-skewed command; users repeat it. This policy requires real-channel validation.

The browser evidence above was produced successfully in the creator's managed Chromium environment. The original independent v1 browser launch was blocked by its environment before app tests. Independent v2 review subsequently passed all 49 Node tests and replay and reviewed the actual HUD/mobile pixels. Interactive browser results remain creator-side evidence, not an independent browser-flow reproduction.

## Findings fixed

- New identity salts after restart could let one account occupy a second role. Persisted identity key and recovery assertions preserve role locks.
- Delayed pre-reset packets could enter a fresh round. Added reset timestamps and generation checks, including interrupted replay coverage.
- A connection without a welcome could hang indefinitely. Added welcome timeout and bounded retry scheduling.
- Authorization failures could retry indefinitely. HTTP 401/403 now stop with an actionable reason; no renewal is attempted.
- Failed reconnect migration could leave the app stuck. Candidate failure now enters the regular reconnect path.
- A journal write failure during live disconnect could throw in a callback. Live play now blocks until storage is repaired and the app restarts.
- Restored live gameplay could resume without streamer intent. Live startup now checkpoints a pause.
- The initial hostile Host test used Fetch, which did not send the intended override. Replaced it with a raw Node HTTP test and verified the actual rejection. The server gate was already present.
- Default npm cache creation failed; a task-owned `/tmp` cache produced the lockfile without escalation or policy bypass.

## Exact pending live action

**Not attempted; pending owner authorization:** start the live adapter for the target Twitch channel, including the EventSub subscription POST to `https://api.twitch.tv/helix/eventsub/subscriptions`. No credentials or grants were supplied, and registration, OAuth, protected network setup and third-party writes were excluded from prototype authorization. The current cloud policy does not grant the Twitch API or WebSocket destinations. No live Twitch operation was denied or has an uncertain outcome because none was attempted.

Required next: authorized registered app Client ID; matching user token with `user:read:chat`; numeric broadcaster/user IDs; token validation/expiry handling; approved API/WebSocket connectivity; three real accounts/roles; actual OBS composition and live acceptance. See `DEMO.md`.

Also pending, unattempted: repository publication/judging access, Devpost registration/eligibility/submission, actual development/live video recording and final video under three minutes. The package contains a 2:45 storyboard and actual session ID, not fabricated footage.

## Isolation

All code work used `/workspace/chat-escape` and task-owned temporary paths. No House checkout content was inspected, modified, executed or imported. No owner's desktop was accessed. The archive excludes local journals, environment files, dependencies, delivery helpers and other workspace directories. It contains no real keys or raw real viewer data. Runtime dependencies: zero. Pinned browser test tooling is included in package metadata and lockfile.

## Final cosmetic correction

Replaced the unsupported external-link glyph with the ASCII label `Open overlay (new tab)`. Re-inspected the actual mobile screenshot and reran the 13 full-flow and 19 HUD/mobile browser checks: all passed. No game, Twitch adapter, authorization or deployment change was made.
