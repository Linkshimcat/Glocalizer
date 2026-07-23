import { Router } from 'express';
import { regenerateHandler, saveEditorStateHandler, updateOcrHandler } from '../controllers/editor.controller.js';
import { projectAuthMiddleware } from '../middleware/project-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { assetParamsSchema, regenerateSchema, saveEditorStateSchema, updateOcrSchema } from '../schemas/editor-state.schema.js';
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
