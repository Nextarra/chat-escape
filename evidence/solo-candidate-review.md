# Solo candidate verification — October 30, 2026

## Automated checks

Final full `node --test test/*.test.js`: **87 passed, zero failed, skipped or cancelled**. See `solo-unit-tests.txt`. This includes the prior 76 tests plus 11 solo cases covering ownership, role switching, retained clues/votes, incorrect votes, one-account victory, duplicate delivery, 30-second boundary/expiry, pause/resume/delayed delivery, mode/reset/run boundaries, journal recovery, mocked EventSub solo victory, privacy, fixture disclosure and HTTP restrictions. Cooperative role-lock and 12-second regressions remain green.

Independent read-only reviewer found and confirmed fixes for contradictory overlay participant text, synthetic victory claiming real participation, rejected join prompts after victory, and a duplicate badge write affecting polling recovery. Re-review found no further substantive defect in reducer/server/reset/replay/persistence. Reviewer pure checks passed; its sandbox HTTP/journal failures were environment restrictions. The final unrestricted suite above passed those checks.

## Supported-browser verification

Nextarra Chrome, isolated **fixture** instance at port 4323. No Twitch packets or public chat were sent by these tests.

- Initial mode cooperative, ready, zero counters.
- Mode selection alone leaves the existing run unchanged. Cancel button and Escape dismiss new-expedition confirmation without changing completed progress.
- Confirming solo creates a new ready run; reload restores selected solo mode. Confirmation text explicitly clears all progress and players.
- Solo replay paused after six accepted commands; paused overlay retained three recovered fragments and one active role. Replay stopped with explicit feedback and its button re-enabled.
- Fresh solo replay completed: WON, **16 accepted / 0 duplicate / 0 rejected**, all fragments. Controller and overlay displayed SOLO and FIXTURE SIMULATION / NO TWITCH. Active/inactive stations replaced fictional viewer counts; all victory commands showed COMPLETE. Screenshot visually inspected.
- Induced `/api/state` 503: controller and overlay showed OFFLINE. Restoring the identical completed state restored normal badges/objective and preserved all counters; stale connection warning cleared.
- Repeated solo replay interrupted by confirmed cooperative reset: READY, zero counters, replay stopped/button re-enabled. Cooperative replay then completed **12 accepted / 0 duplicate / 0 rejected**, restored cooperative labels and three-account disclosure. Browser reload preserved victory.
- Candidate browser error log returned no errors at final inspection.
- Original live game independently still showed **TWITCH CONNECTED**, READY, zero counters. Its helpers/source/session were not changed.

## Limits

This is simulated browser QA and mocked transport validation, **not** live solo or multiplayer proof. Real reconnect lifecycle remains mock-tested. No camera, stream, public messages, credential generation or publication.

Supported viewport override requested 390x844 but the browser remained 1036x524; override was reset. Consequently **new mobile geometry is not verified**. Desktop controller had no horizontal overflow, and the solo overlay at the actual browser size was visually clear. Historical responsive/accessibility screenshots in this copy describe the earlier cooperative build, not new solo UI certification. The Playwright CLI browser scripts were updated for the new reset dialog/replay label but were not executed in this environment; browser interactions used the supported computer-use tool.

Native browser confirmation handling initially timed out without resetting the fixture. The candidate now uses an accessible in-page confirmation dialog, whose Cancel, Escape and Create flows were verified. No uncertain operation was blindly repeated.

Remaining before publication: actual Twitch solo playthrough (bounded approval needed), mobile layout verification, final screen-only demo and review. Cooperative live victory remains unverified.

## Actual live follow-through — October 31

Same candidate source, no code changes or test rerun. Existing-secret same-app OAuth validated nextarra and exact user:read:chat scope. Actual Twitch chat UI sent and verified exactly the approved 16 messages; each yielded the expected next accepted count. Game mode live/solo, connected, WON, three clues, 16 accepted, zero duplicate/rejected, one active account. Controller and live overlay visually verified. See twitch-live-solo-2026-10-31.json. This is real solo proof, not cooperative proof. Screenshots were inspected in conversation; no continuous demo video captured.
