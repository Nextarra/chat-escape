# Requirements and traceability

| Requirement | Implementation | Evidence / remaining step |
| --- | --- | --- |
| Isolated standalone work; leave House untouched | Dedicated `/workspace/chat-escape`, no House imports or execution | Archive contains only this project; no House checkout content accessed |
| Playable original room with complementary participation | `src/game.js`, three locked roles, role-specific clues, unanimous role votes, timed charge | Game end-to-end test, 27 vote combinations, browser replay |
| One account cannot satisfy all roles | Join lock on stable pseudonymous user identity | Unit, browser and journal recovery tests; cannot detect one human's multiple accounts |
| Streamer start/pause/reset | Protected `/api/control`, controller UI | Browser controls and paused-mutation tests |
| Duplicate delivery and spam protection | Per-run ID set, persisted recovery IDs, cooldown, command allowlist, hard bounds | Duplicate, cooldown, 500-message paused flood tests |
| Stale event isolation | Run generation, strict reset/resume boundary, monotonic accepted event times and bounded ingress age; client captures run | Reset/resume exact-millisecond tests, future/stale/time-order tests, interrupted browser replay |
| Reconnect without replaying actions | Lifecycle/generation guards, Twitch migration/new-session retry, duplicate checks, explicit resume | Deferred subscription success/failure, closed socket, stop/restart, stale watchdog and duplicate welcome regression tests; mocked packet→HTTP test; real network untested |
| Durable restart/recovery | Atomic journal replacement, stable identity key, fail-closed corruption/storage errors | Recovery, corrupted journal, persistence failure and live resume tests |
| Hostile chat / privacy | Allowlisted commands only; keyed identity, no raw chat rendered or logged; CSP | HTTP/browser injection tests and no identity in public state assertions |
| Local controller access | Loopback, Host gate, HttpOnly same-site cookie, Origin match, JSON size/type validation | CSRF, Host, cookie, malformed/oversize JSON tests |
| Watchable overlay and late arrival context | Dedicated 16:9 HUD, large next commands, server countdown, fragments, last signal, open-portal three-team reveal | 1280×720 and 1920×1080 captures, wide-window letterboxing and phase geometry tests; actual OBS composition still needed |
| Accessible UI | Labels, language, text+symbol status, focus styles, live regions, mobile toolbar, reduced-motion reveal and solid reading surfaces | 320/390px overflow, above-fold commands/controls, keyboard and touch-target tests, six WCAG-tagged scans plus supplementary contrast checks; full assistive-technology audit remains unperformed |
| Actual Twitch functionality | Documented EventSub v1 adapter, disabled without explicit credentials | Real nextarra EventSub connection and two-command one-account test passed; full three-account live acceptance remains pending |
| Codex development evidence | Real session ID stored; code and tests created in session | `CODEX_SESSION_ID.txt`; development footage still needs recording |
| Submission demo under three minutes | Revised 2:40 screen-only plan separating real chat receipts, synthetic cooperation, and actual Codex footage | `DEMO.md`; final live video and entry have not been produced/submitted |
| Reproducible portable delivery | Zero runtime dependencies, pinned browser tooling, README, tests and evidence | Source archive; clean-room extraction smoke check described in EVIDENCE.md |
| Review regression: bounded charge window | Nondecreasing accepted event time plus nonnegative charge age | Exact 100000/101000/80000 reproduction, all six arrival orders, 12000/12001ms boundary and future view tests |
