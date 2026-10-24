import rateLimit from 'express-rate-limit';
import { explainJapanese } from '../services/japanese-meaning.service.js';
import { explainJapaneseSchema } from '../schemas/japanese-meaning.schema.js';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { requireParam } from '../utils/request-params.js';
import { Router } from 'express';
import { createOcrRegionHandler, detectOcrRegionHandler, regenerateHandler, saveEditorStateHandler, suggestCaptionHandler, updateOcrHandler } from '../controllers/editor.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { assetParamsSchema, createOcrRegionSchema, detectOcrRegionSchema, regenerateSchema, saveEditorStateSchema, updateOcrSchema } from '../schemas/editor-state.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const editorRouter = Router();

editorRouter.put(
  '/projects/:projectId/assets/:assetId/editor-state',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(saveEditorStateSchema, 'body'),
  asyncHandler(saveEditorStateHandler),
);

editorRouter.post(
  '/projects/:projectId/assets/:assetId/regenerate',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(regenerateSchema, 'body'),
  asyncHandler(regenerateHandler),
);

editorRouter.patch(
  '/projects/:projectId/assets/:assetId/ocr',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(updateOcrSchema, 'body'),
  asyncHandler(updateOcrHandler),
);

editorRouter.post(
  '/projects/:projectId/assets/:assetId/ocr/regions/detect',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(detectOcrRegionSchema, 'body'),
  asyncHandler(detectOcrRegionHandler),
);

editorRouter.post(
  '/projects/:projectId/assets/:assetId/ocr/regions',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  validate(createOcrRegionSchema, 'body'),
  asyncHandler(createOcrRegionHandler),
);

editorRouter.post(
  '/projects/:projectId/assets/:assetId/ocr/caption-suggestion',
  validate(assetParamsSchema, 'params'),
  projectAuthMiddleware,
  asyncHandler(suggestCaptionHandler),
);

editorRouter.post(
  '/projects/:projectId/assets/:assetId/japanese-meaning',
  validate(assetParamsSchema, 'params'), projectAuthMiddleware,
  rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false,
    keyGenerator: req => req.auth?.sub ?? requireProject(req).id,
    message: { error: { code: 'RATE_LIMITED', message: '잠시 후 뜻 확인을 다시 시도해주세요.' } },
  }),
  validate(explainJapaneseSchema, 'body'),
  asyncHandler(async (req, res) => {
    res.json(await explainJapanese(requireProject(req).id, requireParam(req, 'assetId'), req.body.regionId, req.body.text));
  }),
);
