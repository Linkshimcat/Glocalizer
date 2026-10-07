# Character-led main page

## Accepted direction

Keep the earlier character-led first screen from `docs/design/studio/landing-desktop.png`. Follow it with the existing translation strip, original standalone video, current device/scroll story, image-first workflow, comparison cases, OGQ gallery and pale-green final CTA. Changes apply only to the main page; existing dashboard, editor and result work remains intact.

## Implementation

- Restore white background, large left title, right character, green start action and centered header navigation. Mobile shows title/actions before artwork.
- Reuse the existing character, translation strip, workflow images, product captures, device frames and MotionGrap video.
- Show the original 1920×1080, approximately 18.6-second video at 16:9, up to 1120px wide, without blur, enlargement or a background overlay.
- Autoplay muted when at least half visible; pause below that threshold and when the document is hidden. Resume automatic playback on returning unless the user paused or the video ended. Keep native playback/seeking controls and a replay button.
- Reduced motion uses manual video playback, displays all three services in normal flow, and disables reveal effects. Short mobile landscape screens also show all three services.
- Preserve measured header height, responsive device sizing, scene transitions, Korean product captures and localized live screens.
- Place workflow images first and provide direct generation/localization/review links with existing staged reveals.
- Keep conditional permitted showcases, comparison sliders and OGQ success/fallback behavior.
- Add video copy to the existing four-language dictionary. Japanese/Chinese text wraps at natural character boundaries.
- Application changes are limited to `LandingRemake.tsx`, scoped `landing.css` and video translations. No backend or public API changes.

## Verification and preview

Local preview: http://localhost:5173/.

The frontend defaults to `http://localhost:3000/api/v1`. Without a local backend the existing OGQ fallback image appears. Verification uses deterministic local fixtures, without production accounts or paid AI calls.

See root `design-qa.md` and `docs/design/character-main/` for matched captures, findings, fixes and checks. The prior video-background restoration QA is preserved in `docs/design/main-restyle/design-qa.md`.
