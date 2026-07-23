# Backend API additions

## `PATCH /api/v1/projects/:projectId/assets/:assetId/ocr`

`X-Project-Token`이 필요하다. 대표 OCR 문구와 normalized bbox를 수정하고 해당 asset의 번역·cleanup만 무효화한 뒤 재실행한다.

```json
{ "text": "킹받았죠?", "normalizedBox": { "x": 0.2, "y": 0.3, "width": 0.5, "height": 0.14 } }
```

응답은 `202 { "assetId": "…", "status": "reprocessing" }`이다. 다른 asset의 결과는 변경하지 않는다.
