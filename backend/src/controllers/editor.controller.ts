import type { Request, Response } from 'express';
import { regenerateTranslation } from '../ai/localization/localization.service.js';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { saveEditorState } from '../services/editor-state.service.js';
import { queueOcrEdit, detectOcrSelection, deleteOcrRegionAndReprocess } from '../services/ocr-review.service.js';
import { suggestCaptionForAsset } from '../ocr/caption-suggestion.service.js';
import { saveEditedThumbnail } from '../services/thumbnail.service.js';
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

export async function updateOcrHandler(req: Request, res: Response) {
  const projectId = requireProject(req).id;
  const assetId = requireParam(req, 'assetId');
  const job = await queueOcrEdit(projectId, assetId, req.body.text, req.body.normalizedBox, 'revise', req.body.regionId);
  res.status(202).json({ assetId, status: 'reprocessing', jobId: job.jobId });
}

export async function detectOcrRegionHandler(req: Request, res: Response) {
  const result = await detectOcrSelection(requireProject(req).id, requireParam(req, 'assetId'), req.body.normalizedBox);
  res.json(result);
}

export async function createOcrRegionHandler(req: Request, res: Response) {
  const projectId = requireProject(req).id;
  const assetId = requireParam(req, 'assetId');
  const job = await queueOcrEdit(projectId, assetId, req.body.text, req.body.normalizedBox, 'create', undefined, req.body.origin);
  const regionId = job.regionId;
  res.status(202).json({ assetId, regionId, status: 'reprocessing', jobId: job.jobId });
}

export async function deleteOcrRegionHandler(req: Request, res: Response) {
  await deleteOcrRegionAndReprocess(requireProject(req).id, requireParam(req, 'assetId'), requireParam(req, 'regionId'));
  res.status(204).send();
}

export async function saveThumbnailHandler(req: Request, res: Response) {
  await saveEditedThumbnail(requireProject(req).id, requireParam(req, 'assetId'), req.body);
  res.status(204).send();
}

export async function suggestCaptionHandler(req: Request, res: Response) {
  const suggestion = await suggestCaptionForAsset(requireProject(req).id, requireParam(req, 'assetId'));
  res.json(suggestion);
}
