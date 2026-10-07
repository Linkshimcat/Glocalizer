> 메인 페이지는 이후 배포 원본의 영상·기기 프레임·스크롤 구성을 복원했습니다. 최신 방향과 변경 사항은 [main-restyle.md](./main-restyle.md)를 참고하세요. 아래 기록은 이전 시안 구현 이력입니다.

# Studio UI redesign — 2026-10-07

Selected direction: `exec-59a4cc65-dd49-41fc-8566-8e412df02d67.png`.

## Implemented

- Main: hand-drawn hero artwork, clear Korean display type and a Korean/English/Japanese artwork sequence. Generation → localization → review still changes as the user scrolls. Scene controls and direct entry buttons work. Reduced motion exposes each service as a normal section.
- Dashboard: active work first, compact creation actions and real project thumbnails in a gallery. Existing rename/delete/open/save behavior retained.
- Editor: original/preview tabs across screen sizes, larger canvas with independent display scaling, cleaner translation/font/style controls, readable frame rail and scrollable inspector. Cleanup guidance is inline rather than an automatic toast over the toolbar.
- Results: clear ready/download state, visible download action, actual composed PNGs and the existing enlarged comparison modal.
- Shared: darker readable secondary text, local Pretendard, accessible green action buttons, visible focus, larger touch controls, flat footer, simpler upload surfaces. Account/archive/login/review/service/support inherit the same styling.

No backend API, database or persistence schema changes were required for this redesign. Earlier uncommitted workflow improvements and stashed work were preserved.

## Assets

Built-in imagegen generated `frontend/src/assets/studio/hero-character.png` and `translation-strip.png` from the selected reference. Both have genuine transparency; original generated files were retained. Prompts: reproduce the chosen hand-drawn panda hero with “Hi there!” bubble and globe; reproduce its three-pose translation row with “안녕!”, “Hi there!”, “こんにちは!”, green arrows and yellow doodles. Website UI and language labels remain actual HTML.

Pretendard 1.3.9 static fonts were downloaded from the package's distribution and bundled locally. License: `frontend/src/assets/fonts/LICENSE-Pretendard.txt`.

## Review and reproduction

- Local preview: http://localhost:5173/.
- Selected board, desktop/mobile captures and combined comparisons: `docs/design/studio/`.
- Detailed findings, iteration history, state differences and verification limits: root `design-qa.md`.

From `frontend/`, start Vite and run:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
npm run build
npm run lint
npm run check:studio
npm run check:public-pages
npm run check:workflows
```

Browser checks use local deterministic API fixtures; they do not access production accounts or paid AI services. `check:studio` writes temporary captures to `/tmp/glocalizer-studio-qa`.
