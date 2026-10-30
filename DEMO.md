# Demo and live acceptance plan

## Honest positioning

Chat Escape turns quiet spectators into a small expedition. Each team owns a different instrument and fragment of the solution, so one account and a majority poll cannot complete the room. Three team contributions unlock the shared reveal. All included recordings/screenshots/replays are fixtures. Do not edit a fixture recording to imply actual Twitch behavior.

## Remaining authorized live test (not performed)

1. Obtain explicit owner authorization for the registered Twitch app, read-chat user token and one target channel, and for the EventSub subscription POST. No registration, new OAuth grant or credentials creation is included in this prototype's authorization.
2. Approve the necessary cloud network destinations or run locally in an approved environment. Verify token scope `user:read:chat`, token/user/app match and expiration. Enable `--live` privately; verify overlay reads **TWITCH • CONNECTED** and fixture injection returns 403.
3. Use **three real authorized accounts**: streamer plus at least two actual participants. Assign Scout, Scribe and Engineer. Show their real Twitch chat commands and the corresponding overlay updates. Do not invent participants or messages.
4. Try one person's role switch and show it cannot fill another role. Discover all clues, vote the wrong route once, then coordinate the correct route. Time out one charge and renew it. Complete a real shared escape.
5. Pause and send a fresh gameplay command; confirm it changes no clue/vote/charge. Resume, then reset; confirm delayed packets from before reset cannot populate the new round. Disconnect the connection, observe the pause, reconnect and deliberately resume. Check actual Twitch duplicate delivery if observed; otherwise label duplicate verification as mocked.
6. Add the local `/overlay` to OBS at **1280×720** (or 1920×1080) and verify its crop, readability and actual stream capture. Inspect browser/server logs without exposing credentials. Stop after testing, revoke/expire the test token through the authorized process and remove local identity journals when appropriate.
7. Keep an evidence sheet identifying actual channel, consenting test participants, timestamp, app version, live results and remaining failures. The delivered fixture evidence is not a substitute.

## 2:45 final video storyboard (must use actual Twitch footage)

| Time | Picture | Narrative |
| --- | --- | --- |
| 0:00–0:15 | Actual Twitch stream, overlay in view | “What if the whole chat had to escape together?” Show the three instruments and goal. |
| 0:15–0:45 | Real viewer joins and discoveries | Scout telescope, Scribe mural and Engineer radio yield complementary clues; one account's attempted role switch fails. |
| 0:45–1:15 | Clues and real chat vote commands | Explain the shared sequence. Each team contributes rather than outvoting the others. |
| 1:15–1:35 | Real !charge messages and gate reveal | Show cooperation and the shared win, including a clear reaction from participants. |
| 1:35–2:00 | Pause/reconnect proof with real adapter | Briefly show deliberate resume and state preservation. Label any mocked failure footage explicitly. |
| 2:00–2:30 | Actual Codex development session and tests | Show the real session ID, a code/test change and the passing results. Explain the recovery identity bug and fix. Do not show credentials or unrelated workspaces. |
| 2:30–2:45 | Overlay, repo/session reference and closing shot | State scope: one room, safe controls, browser source; make judging access and actual live behavior easy to verify. |

Use the exact ID from `CODEX_SESSION_ID.txt`. Session evidence here is the real identifier and generated source/tests, not a claim that a screen recording already exists. Eligibility, repository access/publication, Devpost submission and any stage attendance remain owner decisions. Follow the official rules over this planning document.

## Official reference pages (checked 2026-10-28)

- Rules and equally weighted criteria: https://twitchcon-codex.devpost.com/rules
- Entry resources and FAQ: https://twitchcon-codex.devpost.com/resources
- Twitch WebSocket lifecycle: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- Chat notification and scope: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage
- EventSub subscription API: https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription
