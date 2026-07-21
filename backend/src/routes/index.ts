import { Router } from 'express';
import { editorRouter } from './editor.routes.js';
import { healthRouter } from './health.routes.js';
import { processRouter } from './process.routes.js';
import { projectRouter } from './project.routes.js';
import { resultRouter } from './result.routes.js';
import { uploadRouter } from './upload.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(projectRouter);
apiRouter.use(uploadRouter);
apiRouter.use(processRouter);
apiRouter.use(resultRouter);
apiRouter.use(editorRouter);
