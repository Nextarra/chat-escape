> **October 31 live update:** The approved real Twitch solo playthrough passed as nextarra: 16 accepted, 0 duplicate, 0 rejected; 3 clues and SOLO WON with one active account. The final five commands completed in 6.726 seconds of observed browser execution. See `evidence/twitch-live-solo-2026-10-31.json`. No continuous video was recorded. Cooperative live victory and mobile layout remain unverified; publication/submission remain on HOLD. The sequence below records the completed test; repeating it requires new authorization.

# Solo expedition candidate — not published

This candidate extends the reviewed preparation build. Cooperative expedition remains the default with locked roles, three distinct accounts and the original 12-second charge window. Solo is optional, explicitly labeled in controller and overlay, and uses one account manually switching stations. It does not create viewers or auto-play teammates.

## Rules fit

The official rules checked October 30, 2026 require an interactive experience connecting to Twitch and functionality matching the description/video. They do not specify a minimum player count. An optional genuine Twitch solo path is compatible with those stated project requirements; this is not a guarantee of eligibility or judging acceptance. Source: https://twitchcon-codex.devpost.com/rules (Project Requirements and Submission Requirements).

## Playing solo

Select **Solo expedition** under **Next expedition**, click **New expedition**, then confirm **Create expedition**. Cancel or Escape leaves the existing expedition intact. Selection alone never changes the running mode. New expedition clears all progress and ownership. Start / resume begins play.

The first account to join owns this solo run. Other accounts are rejected. Use `!join scout`, `!join scribe`, or `!join engineer` to change the active station. Collected clues and station votes persist. Each station still needs its own command and correct vote. Charge all three stations within 30 seconds; expired charges must be renewed manually. Pause/reconnect does not automatically resume or extend charge deadlines.

Mode and ownership are restored by journal replay when journal storage is enabled. A new expedition preserves the mode unless a different mode is explicitly selected. The private live helper intentionally uses memory only: stopping it loses the session and game state. No tokens are stored in the candidate.

## Completed live test — October 31

Destination: https://www.twitch.tv/nextarra, from the verified **nextarra** account. Start a fresh solo expedition first. Send exactly these 16 messages, one at a time, at least 1 second apart; verify each delivery before continuing. The final five messages must finish within 30 seconds. Stop on uncertain send or unexpected result; inspect receipts before any retry.

1. `!join scout`
2. `!scan prism`
3. `!join scribe`
4. `!decode mural`
5. `!join engineer`
6. `!tune radio`
7. `!vote moon-star-sun`
8. `!join scribe`
9. `!vote moon-star-sun`
10. `!join scout`
11. `!vote moon-star-sun`
12. `!charge`
13. `!join scribe`
14. `!charge`
15. `!join engineer`
16. `!charge`

Verified result: actual Twitch receipts and live EventSub delivery, one account/one active role, all three clues and votes, SOLO COMPLETE, 16 accepted, zero duplicate/rejected. All 16 approved sends were used once. No continuous footage was captured.

## Activation boundary and remaining gaps

The running live helper imports this candidate from `chat-escape-solo-candidate/src/server.js`. It completed the real solo test and remains at victory. The separate port-4323 instance is fixture-only. The private helper and credentials are excluded from publication. Restarting that helper ends its memory-only session; never recover credentials from process memory.

Still pending: mobile layout validation, actual screen-only Twitch/Codex footage under three minutes, reviewed candidate publication and final readiness. Any additional recorded gameplay run needs a new bounded message approval. Full real cooperative victory remains unverified and requires two additional consenting participants. Solo validation does not certify multiplayer. Submission remains on HOLD. Never activate the camera or broadcast.
