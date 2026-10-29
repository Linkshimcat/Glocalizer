import type { Request, Response } from 'express';
import { requireProject } from '../middleware/project-auth.middleware.js';
import type { UpdatePersonaInput } from '../schemas/persona.schema.js';
import { setProjectPersona } from '../services/persona.service.js';

export async function updatePersonaHandler(req: Request, res: Response) {
  const persona = await setProjectPersona(requireProject(req), (req.body as UpdatePersonaInput).persona);
  res.json({ persona });
}
