import { z } from 'zod';
import { targetLanguageSchema } from './project.schema.js';

export const assetParamsSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
});

// 프런트 에디터가 다루는 스타일 필드는 계속 늘어날 수 있어서, 알려진 필드는 타입을 검증하되
// 새 필드가 추가돼도 백엔드 배포 없이 그대로 저장되도록 passthrough를 둔다.
const editorStyleSchema = z
  .object({
    suggestion: z.number().optional(),
    customText: z.string().optional(),
    font: z.string().optional(),
    size: z.number().optional(),
    weight: z.number().optional(),
    rotation: z.number().optional(),
    color: z.string().optional(),
    transparent: z.boolean().optional(),
    strokeOn: z.boolean().optional(),
    strokeWidth: z.number().optional(),
    strokeColor: z.string().optional(),
    backgroundOn: z.boolean().optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    backgroundOpacity: z.number().min(0).max(100).optional(),
    backgroundPadding: z.number().min(0).max(24).optional(),
    backgroundRadius: z.number().min(0).max(32).optional(),
    shadowOn: z.boolean().optional(),
    shadowColor: z.string().optional(),
    shadowBlur: z.number().optional(),
    shadowY: z.number().optional(),
    shadowOpacity: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    imageScale: z.number().optional(),
    manualCleanup: z
      .object({
        mode: z.enum(['transparent', 'solid']),
        rect: z.object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          width: z.number().min(0).max(1),
          height: z.number().min(0).max(1),
        }),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
      .optional(),
  })
  .passthrough();

export const saveEditorStateSchema = z.object({
  languageCode: targetLanguageSchema,
  regionId: z.string().uuid(),
  style: editorStyleSchema,
});

export const regenerateSchema = z.object({
  regionId: z.string().uuid(),
  languageCode: targetLanguageSchema,
  tone: z.enum(['cute', 'funny', 'energetic', 'serious', 'sarcastic']).optional(),
  translationStyle: z.enum(['natural', 'trendy', 'literal']).optional(),
});

export const updateOcrSchema = z.object({
  text: z.string().trim().min(1).max(200),
  normalizedBox: z.object({
    x: z.number().min(0).max(1), y: z.number().min(0).max(1),
    width: z.number().positive().max(1), height: z.number().positive().max(1),
  }).refine((box) => box.x + box.width <= 1 && box.y + box.height <= 1, 'normalizedBox must be within image bounds'),
});
