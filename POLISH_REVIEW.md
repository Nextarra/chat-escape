# Spectator and mobile polish review — 2026-10-29

All captures are actual Chromium screenshots of the local **fixture simulation**. They are not Twitch or OBS captures. This pass implements the bounded presentation feedback without changing the puzzle, Twitch authorization or House.

## Reviewed flow

1. **Ready HUD — passes local checks.** [05-hud-ready-1280.png](evidence/05-hud-ready-1280.png) is a complete 1280×720 composition. Join commands, objective, role requirements and progress are visible together. No marketing hero, full log, form or controller loads on this route. Objective text measures 34.048px and team commands 24.32px at this size.
2. **Alignment — passes local checks.** [06-hud-align-1280.png](evidence/06-hud-align-1280.png) shows the recovered clues, route choices, per-team vote prompt and last meaningful signal. Geometry checks confirm these fit above the clue strip.
3. **Charging — passes local checks.** [07-hud-charge-1280.png](evidence/07-hud-charge-1280.png) shows one charged team, two outstanding contributions and a prominent 9-second countdown. The test advanced a controlled server fixture clock from 12 to 9 seconds; this is not a real Twitch latency measurement.
4. **Paused — passes local checks.** [11-hud-paused-1280.png](evidence/11-hud-paused-1280.png) replaces the countdown with PAUSED and explicitly tells viewers to wait for streamer resume.
5. **Shared victory — passes local checks.** [08-hud-victory-1280.png](evidence/08-hud-victory-1280.png) and [09-hud-victory-1920.png](evidence/09-hud-victory-1920.png) show the open portal, original CSS home landscape, strong completion message and HOME status for all three teams. Normal-motion doors complete their reveal; reduced-motion mode has zero transition duration and directly presents the final state. No licensed assets or external media are used.
6. **Mobile controller — passes local checks.** [10-mobile-first-screen.png](evidence/10-mobile-first-screen.png) is the actual 390×844 viewport. Join commands end at y=292.39 and streamer controls at y=496.98, both above the fold. Primary controls are at least 44×44px, remain reachable during scroll and do not cover a focused form field. The page remains 2281px tall because it includes the room, clues and fixture tools; it is not represented as a one-screen app. The full mobile page is [04-mobile.png](evidence/04-mobile.png).

## Verification and accessibility

- 49 Node automated tests pass, including the two new presentation/countdown tests and all previous lifecycle/timing regressions.
- 13 original full-flow browser checks pass.
- 19 dedicated HUD/mobile browser checks pass, including 1280×720, 1920×1080 and wide-window letterboxing; 320/390px horizontal overflow; mobile command/control placement; keyboard order; touch targets; pause/countdown; and both motion preferences.
- Six WCAG-tagged axe-core 4.14.0 scans report **zero violations**: HUD ready, align, charge and victory; mobile controller; desktop controller. Decorative aria-hidden art is excluded from those scans.
- Axe leaves 1–3 text contrast review items per scanned state because of its overlap/background inference. They remain visible in the raw report. Supplementary calculations from the foreground color and solid reading surface give ratios from **9.25:1 to 14.53:1**, above the 4.5:1 assertion. Screenshots were separately inspected for overlap. This is not full accessibility certification or an assistive-technology audit.
- The test executes the trusted axe bundle through Playwright's evaluation API. The application's CSP remains unchanged; no inline script or remote script permission was added.

During this pass, checks caught an account-disclosure/clue overlap, a HUD header line-height overlap, gradient-dependent text surfaces and a generic element with an inappropriate accessible label. These were corrected. HUD text now scales with the actual composition rather than an unusually wide browser viewport.

## Remaining real-world checks

Actual Twitch authorization, three real participating accounts (streamer plus two viewers), network access, OBS browser-source composition, stream readability/compression, assistive-technology behavior and final live demo recording remain unperformed. No deployment, publication or submission was attempted. First prize is a target, not a guaranteed outcome.

## Final label correction

Independent v2 pixel review found an unsupported external-link glyph. The controller now uses the ASCII label **Open overlay (new tab)**. The updated mobile screenshot was visually inspected, and all 13 full-flow plus 19 HUD/mobile browser checks passed again. The game and Twitch adapter were unchanged.
