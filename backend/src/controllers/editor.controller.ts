import type { Request, Response } from 'express';
import { regenerateTranslation } from '../ai/localization/localization.service.js';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { saveEditorState } from '../services/editor-state.service.js';
import { requireParam } from '../utils/request-params.js';

export async function saveEditorStateHandler(req: Request, res: Response) {
  const { languageCode, regionId, style } = req.body;
  await saveEditorState(requireProject(req).id, requireParam(req, 'assetId'), regionId, languageCode, style);
  res.status(204).send();
}

export async function regenerateHandler(req: Request, res: Response) {
  const { regionId, languageCode, tone, translationStyle } = req.body;
  const result = await regenerateTranslation(requireProject(req).id, requireParam(req, 'assetId'), regionId, languageCode, {
    tone,
    translationStyle,
  });
  res.json(result);
}
