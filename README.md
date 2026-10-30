# Chat Escape — The Last Observatory

A standalone, playable Twitch chat escape room prototype built with Codex. One original room, three complementary viewer teams, one shared reveal. **Default mode is FIXTURE SIMULATION. No live Twitch integration has been exercised.**

The runtime is a local Node.js server with a controller and a separate spectator overlay. Live Twitch acceptance testing is still pending; the included replay and screenshots use synthetic viewers.

## Quick start (no package installation required)

Install Node.js 22+ (tested on Node 24.19.0), unzip, open this directory and run:

```sh
node src/server.js
```

Open **http://127.0.0.1:4317**. Choose **Play guided cooperation replay**. Three clearly synthetic viewers complete the room in about 12 seconds. You can also start the game and use the fixture chat form manually. Open **http://127.0.0.1:4317/overlay** as a local OBS Browser Source; choose **1280×720** (also tested at 1920×1080). The HUD is a separate 16:9 composition with large team commands, the objective, a server-driven charge countdown, recovered clues and last meaningful action. It does not load the controller or its marketing hero. The overlay contains no controller controls or fixture inputs. OBS itself was not exercised here.

Keep one server process per journal and use the same hostname in the browser. The server binds only to IPv4 loopback, rejects nonlocal Host headers and requires its HTTP-only same-site control cookie plus an exact Origin on mutations. These are local workstation protections; this is not a public hosting configuration. Do not expose the port publicly without a separate authenticated deployment design.

## Stream and mobile presentation

`/overlay` is spectator-only and letterboxes to 16:9 in other browser shapes. Use 1280×720 or 1920×1080 for a browser source. Fixture/live disclosure stays at the top. Victory opens an original CSS-drawn portal into a home landscape and credits all three teams. With reduced motion enabled, the complete reveal appears without transitions. No external assets, audio or copyrighted game art are used.

The controller puts join/current team commands above the fold at 390×844. Its sticky toolbar keeps start/resume, pause and reset reachable; form focus scrolls clear of it. The log is collapsed until opened. See `POLISH_REVIEW.md` and the numbered screenshots for verified states and limits.

## How to play

Three actual accounts are needed for live play (the streamer can be one of them):

| Team | Join | Discover |
| --- | --- | --- |
| Scout | `!join scout` | `!scan prism` |
| Scribe | `!join scribe` | `!decode mural` |
| Engineer | `!join engineer` | `!tune radio` |

Roles are locked for the expedition. Each role reveals a different clue. Once all three fragments are recovered, viewers combine them to infer the correct orbit sequence. Every team must send `!vote moon-star-sun`; the alternatives are `!vote sun-star-moon` and `!vote star-moon-sun`. The most recent accepted vote represents that team. Then each team sends `!charge` within a 12-second window. Expired charges need renewing. The shared gate opens only when all three roles contribute.

Command times must be nondecreasing across accepted gameplay actions. Live ingress rejects any timestamp ahead of the local receive clock and anything more than two minutes old. Earlier-than-accepted commands are dropped rather than reordered; ask the viewer to repeat the command. Messages at or before a reset/resume boundary (including its exact millisecond) are conservatively rejected. Keep the host clock synchronized. This deliberate policy may drop legitimate out-of-order or clock-skewed packets; live behavior still needs testing. The charge window uses event time, includes exactly 12,000ms, excludes 12,001ms, and never counts a charge dated after the current event/view clock.

The deterministic reducer receives recorded `now` (event time) and `receivedAt` (ingress time). Local HTTP ingress supplies both; callers cannot override them via the fixture form. Existing version-0 journals without `receivedAt` replay with receipt equal to event time, while the revised ordering/window rules apply. An old journal that exploited a defect may therefore replay into a corrected, unsolved state.

The 800ms per-account cooldown applies to valid commands. One account cannot occupy several roles; multiple accounts controlled by one person cannot be detected. Team voting is deliberately transparent and cooperative; a disruptive member of a team can change its vote. Existing Twitch moderation remains the streamer's responsibility. There are no outbound chat messages, whispers, purchases, external links in chat, or generated game actions.

## Reproduce verification

```sh
npm test
npm run replay
```

These run without third-party packages. `npm test` covers game rules, HTTP boundaries, persistence/recovery and a mocked Twitch transport. `npm run replay` creates a labelled synthetic replay fixture and deterministic recovery report.

For the browser checks, install the pinned development tooling and Chromium:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run test:browser
npm run test:polish
```

By default the browser test uses `/usr/bin/chromium` (available in this cloud). On another machine set `CHROMIUM_PATH` to your installed Chromium executable. If no system Chromium is found at that path, the test automatically uses Playwright's downloaded Chromium. Runtime dependencies: none. Browser test dependencies: Playwright 1.62.1 and axe-core 4.14.0, pinned in `package-lock.json`. `test:polish` checks HUD geometry/readability, countdown, pause, the animated and reduced-motion reveal, mobile touch targets/keyboard reachability and WCAG-tagged automated scans. Axe review items and supplementary computed contrast ratios remain explicit in its results; this is not full accessibility certification.

Read `evidence/unit-tests.txt`, `evidence/browser-results.json`, `evidence/replay-results.json` and `EVIDENCE.md` for measured outcomes. Screenshots are simulation captures, not live Twitch proof.

## Adapter readiness and live prerequisites

`src/twitch.js` implements Twitch EventSub WebSockets using documented `channel.chat.message` version 1, with welcome/session subscription, lifecycle/generation guards on asynchronous subscription completion, keepalive watchdog, notification validation, migration without duplicate subscription, reconnect backoff, revocation stop and authorization failure stop. Closed/superseded sockets and their late callbacks cannot promote themselves or stop a healthy replacement; duplicate welcomes do not create a second subscription. The only remote write is the required EventSub subscription POST; **it has only been mocked here**. The application never sends chat.

Before any live run, obtain owner authorization for the specific app/account access and EventSub subscription. An authorized developer must provide an existing registered Twitch application Client ID, numeric broadcaster ID, numeric authorized user ID and matching **user access token** with `user:read:chat`. Verify current Twitch requirements, token ownership/expiration and Client ID match. This package does not create credentials, grant OAuth, refresh tokens or log token values. `src/authorization.js` validates the supplied token before connecting and at least hourly; invalid identity, Client ID, scope, expiry, revocation or unavailable validation stops the connection. The local installed-app route requires user ID to equal broadcaster ID.

Use a private shell/environment manager to supply `TWITCH_CLIENT_ID`, `TWITCH_BROADCASTER_ID`, `TWITCH_USER_ID`, `TWITCH_USER_TOKEN` and `TWITCH_LOGIN` (your lowercase Twitch username). The CLI defaults `TWITCH_LOGIN` to `nextarra` for the entry owner; judges must override it for their own authorized channel. Then:

```sh
node src/server.js --live
```

No real values are included. Do not put tokens in URLs, browser code, recordings, repository or the delivered archive. Live mode refuses fixture injection. It starts idle and restores playing games as paused; only resume when Twitch is connected. Any adapter disconnect pauses gameplay; reconnect does not resume it automatically. Live packets older than 2 minutes or predating the current reset are ignored. The environment needs approved HTTPS access to `id.twitch.tv` and `api.twitch.tv` and WebSocket access to `eventsub.wss.twitch.tv`; the present cloud policy does not grant these. Use the supported network configuration process; do not bypass its proxy.

Run the acceptance checklist in `DEMO.md` with actual Twitch accounts before claiming live success. Live verification and the final hackathon submission are pending.

## Recovery and privacy

The CLI writes `data/journal.json` atomically before committing each action in memory. Restarting restores current roles, progress and duplicate IDs. A live restart deliberately pauses. A corrupt journal fails closed; preserve it for diagnosis rather than overwriting it. If a journal write fails, the requested action does not commit; live disconnect/storage errors block further play until storage is fixed and the app restarts. Rename is crash-safe at the file replacement boundary, but no fsync/power-loss durability guarantee is claimed.

Only allowlisted commands, message IDs, keyed pseudonyms and event times are persisted. Raw user IDs, display names, ordinary chat, hostile text and tokens are not stored by the app. The local journal also contains its identity HMAC key; it is pseudonymization, not anonymization. Keep `data/` private and delete it after testing when no longer needed. Local fixtures are synthetic. No analytics, third-party assets, fonts or CDNs load in the UI.

Hard bounds: 2,000 accounts per expedition, 20,000 recognized command IDs per expedition in the reducer and 20,000 across the adapter session, 50,000 journal actions per local session. These bounds are prototype limits, not validated Twitch-scale capacity. At capacity, stop, archive/delete the local journal while the app is stopped, and begin a new local session. Reset clears puzzle progress and identities for the round but retains the session journal for recovery; it is not privacy erasure. Do not run concurrent instances against one journal.

## Entry evidence

`CODEX_SESSION_ID.txt` preserves the actual development session identifier. `DEMO.md` contains a 2:45 recording plan and the remaining live acceptance steps. `REQUIREMENTS.md` links features to evidence. `LICENSE` covers original project code. Consult the official rules for eligibility, dates, repository access and judging requirements; no prize or eligibility determination is promised.

