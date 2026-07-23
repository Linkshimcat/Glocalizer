# OCR benchmark

`manifest.example.json`을 `manifest.local.json`으로 복사해 사용자 제공 이미지 30장을 등록한다. `npm run benchmark:ocr`는 완전 일치율, CER, 처리시간 중앙값, Vision fallback 비율을 출력한다. 원본 이미지와 `manifest.local.json`은 커밋하지 않는다.
