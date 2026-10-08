# Character-led UI refresh — 2026-10-08

The landing page keeps the original character, translation strip, video and workflow artwork. Green, white and dark green now distinguish the sections. Short functional copy replaces decorative phrases, the hero rotates through creation/localization/review, and every route uses the same navigation.

## Implementation

- White hero and workflow; dark green device introduction (`#15291F`); bright green closing CTA (`#22C55E`). White-background actions use `#15803D`.
- Korean headline: “이모티콘을” followed by “만드세요”, “현지화하세요”, “검토하세요”. Each phrase lasts 2.4 seconds. Animation pauses offscreen and in hidden tabs; reduced motion keeps the first phrase. A static accessible heading conveys all three actions.
- Shared logo / Studio / Service / language / login or account navigation. Desktop height is 72px; below 1024px it becomes two rows totaling 112px. Workspace actions remain below the navigation.
- Controls use 6px corners, panels 8px, dialogs 12px and badges 4px. Avatars, swatches, toggle handles and device frames retain their functional shapes. Existing Pretendard typography remains.
- The original 1920×1080, approximately 18.6-second video keeps its native controls and unfiltered 16:9 presentation, capped at 1120px. It plays muted when at least half visible and pauses outside the viewport. Reduced motion requires manual playback.
- Three scrolling device scenes, workflow entrances, conditional comparison cases and the animated OGQ gallery remain. Empty or failed OGQ responses show a localized retry action instead of the reference JPG. Successful retries restore the gallery entrance effect.
- All six Korean device captures reflect the current workspace UI. Phone content clears the camera cutout; the editor inspector at 1024px clears the shared header.
- Korean, English, Japanese and Chinese copy updated. No dependencies, public APIs, data types, authentication behavior or save formats changed.

## Verification

| Check | Result |
| --- | --- |
| Production build | Passed |
| ESLint | Passed; six existing warnings |
| Landing: 360, 390, 768, 1280, 1440px × four languages | 20 combinations; 60 service scenes passed |
| Reduced motion | Eight combinations passed; all services and workflow steps visible |
| Video | Visibility threshold, exit/re-entry, user pause, seek, finish and replay passed |
| OGQ and showcases | Success, empty and failed responses; retry, animated entrance and comparison controls passed |
| Workspace navigation | 180 route/language/viewport combinations passed |
| Public pages | 48 route/language/viewport combinations passed; language persistence, TOC, FAQ and blocked storage checked |
| Other routes | Legacy aliases, support, callback denial, login and 404 share one header; account menu and active navigation checked |
| Existing workflows | Generation polling, localization settings, editor undo/batches, preview/download equality, cleanup, session failures and OAuth return passed |
| Runtime and console errors | None in landing checks |

Browser checks use local fixtures for authenticated and external API states; they do not initiate paid generation or alter production accounts. Public/studio/landing layout checks ran against the final production preview; workflow checks ran against the refreshed development server.

Reproduce with `npm run build`, `npm run lint`, `npm run check:landing`, `npm run check:studio`, `npm run check:public-pages` and `npm run check:workflows` in `frontend`. Browser scripts accept `PREVIEW_URL` and `CHROME_PATH`.

## Visual evidence

- Hero: [1440px](hero-1440.png), [390px](hero-390.png).
- Shared navigation across eight routes: [desktop](navigation-1440.png), [mobile](navigation-390.png).
- Device scenes: [phone camera clearance](device-0-390.png), [desktop review](device-2-1440.png).
- [Editor inspector at 1024px](editor-inspector-1024.png).
- Full landing: [1440px](full-1440.png), [390px](full-390.png). The dark introduction spans a pinned scrolling region; full-page screenshots flatten this region. The separate device screenshots show its visible scrolling states.
- [Machine-readable landing results](landing-checks.json).

Screenshots were manually inspected for headline wrapping, character placement, green contrast, section continuity, navigation consistency, device clipping and mobile overflow. The original reference captures under `docs/design/studio` are preserved.
