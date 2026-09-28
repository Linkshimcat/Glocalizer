# Landing page showcase curation

The landing page reads only manually curated rows from `public.landing_showcases` where `published`, `rights_confirmed_at`, and `approved_at` are set and `rights_basis` is `team_owned` or `licensed`. A completed project is never published automatically. The table is unavailable to `anon` and `authenticated`; the backend creates short-lived signed URLs for the two curated copies.

## Publish an approved case

1. Select a completed localization project or completed generation project. Include it only when the team owns the work or has verified a public-use license. Do not infer publication rights from completion status.
2. For localization, export the finished localized image from its saved editor state. A completed localization project stores text and editor state, not a ready-made composited PNG.
3. Copy both comparison images into the private storage bucket under `landing-showcase/<case-id>/original.png` and `landing-showcase/<case-id>/result.png`. Do not point these fields at the project’s private source paths.
4. Insert the case through a trusted server-side database session, setting the real completed project/item IDs, source kind, language for localization cases, `rights_basis`, `rights_confirmed_at`, `approved_at`, `published = true`, and a `sort_order`.

The database trigger rejects publication unless the referenced project and source item are completed. Publication requires a recorded rights basis, rights-check date, and team approval date. Generation cases leave `language_code` null; localization cases must specify it. The public endpoint returns no storage paths or project IDs. If there are no curated rows, the landing page hides the case section.

To withdraw an example, set `published = false`. Remove its copied objects from storage only after confirming no other published case references them.
