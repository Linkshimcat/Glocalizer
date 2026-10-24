# Japanese meaning and payment UX

The editor provides an on-demand Korean explanation of the currently selected Japanese caption. POST `/api/v1/projects/:projectId/assets/:assetId/japanese-meaning` accepts `{regionId, text}`. Existing project authentication runs before the per-account/project 12/minute limiter. The service verifies both asset/project and region/asset membership. Requests are limited to 300 characters, provider calls to 30 seconds, and all five response fields are validated as bounded Korean strings.

Response: `{text, explanation: {meaning, register, usage, nuance, recommendation}}`. The source caption is context only; the prompt asks for the actual meaning of the submitted Japanese. Existing configured OpenAI/Groq credentials are used. No database migration is needed. Explanations are not saved or inserted into exported artwork.

Meaning and tone are visible after requesting an explanation; contextual notes are collapsed. Edited captions retain the previous explanation with a stale label. Text changes and unmounts invalidate outstanding results. Provider errors leave editing/export intact. Speech offers normal/slow playback and stop, using installed Japanese browser voices. Alternatives and rewriting intent remain a separate follow-up.

Payment improvements preserve the checkout integration already on main. Colors follow existing theme variables, native radios support keyboard selection, selected cards include a check and localized text, and checkout errors get focus. Payment success/failure headings receive focus. No live payment is executed during validation.
