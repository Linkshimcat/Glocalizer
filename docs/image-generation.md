# Image generation sample MVP

Only the existing account `yunjae14278@naver.com` can use `/generate`. The backend verifies the current database user on every generation route. Other accounts retain the disabled dashboard card.

## Enable locally

1. Apply `supabase/migrations/20260918190641_emoticon_generation.sql` using the existing migration runner (`npm run db:migrate` from backend). No production migration or deployment is performed by this change.
2. Check API balance and access to `gpt-image-2.5-sunburst`. Reuse the backend `OPENAI_API_KEY`; never put it in frontend variables.
3. Set `ENABLE_IMAGE_GENERATION=true` and restart the backend. Default is false. The UI is available without making paid requests.

Server variables: `IMAGE_GENERATION_OWNER_EMAIL` (defaults to the account above), `IMAGE_GENERATION_BUDGET_USD=8`, `IMAGE_GENERATION_RESERVE_USD=2`.

## Costs and limits

Budget is cumulative across all generation projects, not daily. Each queued call reserves USD 2; a response with usage replaces that reservation with estimated token cost. Unknown or interrupted usage retains its reservation. An atomic SQL transaction prevents concurrent budget/quota bypass. A set consists of one base plus three expressions; up to two extra attempts are allowed, including failures. One project per Korea calendar day; caption editing and download remain available on old projects.

The USD 8 budget/reservation is a conservative application estimate, **not a guaranteed provider billing cap**. A single response may cost more than its reservation, and API billing can lag. It excludes taxes, exchange rate and existing OCR spend. For the user's KRW 20,000 overall test budget, verify the final prepaid purchase amount and disable auto recharge in OpenAI billing. Do not assume billing dashboard budgets stop requests. No paid test has been executed.

## Flow and storage

Prompt + optional reference → base character → explicit confirmation → three expression jobs queued transactionally → individual caption edit/download or regeneration. Confirmed base is immutable. Jobs use dedicated tables and worker, not localization jobs. Queued work survives browser navigation; abandoned running work is failed after ten minutes and never automatically reissued because a paid request may already have succeeded. Private storage signed URLs expire after one hour and are refreshed when loading the workspace.

Backend `/api/v1/generation`: GET config, GET/POST projects, GET projects/:id, POST projects/:id/images, POST projects/:id/confirm, POST projects/:id/samples, PATCH projects/:id/images/:imageId, GET projects/:id/images/:imageId/download. All require JWT and account authorization.

PNG output: 740×640, RGB with alpha, 72dpi, ≤1,000,000 bytes, white character/caption outline. Opaque results are rejected. Sharp does not stretch the character. Captions use a separate server-rendered SVG text layer; the Docker runtime installs Noto CJK fonts. Captions are limited to 16 characters. Final image readability and identity consistency require human review; neither technical output checks nor this four-image sample guarantees OGQ approval. Complete 24-image packaging, main/tab assets, localization, OGQ import and review integration are out of scope.

Official references: https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst and https://creators.ogq.me/faq?faqCategoryId=61c54a8a1fbca
