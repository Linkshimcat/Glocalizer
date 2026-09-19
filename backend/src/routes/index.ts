import { generationRouter } from './generation.routes.js';
import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { downloadRouter } from './download.routes.js';
import { editorRouter } from './editor.routes.js';
import { feedbackRouter } from './feedback.routes.js';
import { healthRouter } from './health.routes.js';
import { ogqRouter } from './ogq.routes.js';
import { processRouter } from './process.routes.js';
import { projectRouter } from './project.routes.js';
import { resultRouter } from './result.routes.js';
import { uploadRouter } from './upload.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(projectRouter);
apiRouter.use(uploadRouter);
apiRouter.use(processRouter);
apiRouter.use(resultRouter);
apiRouter.use(editorRouter);
apiRouter.use(downloadRouter);
apiRouter.use(feedbackRouter);
apiRouter.use(ogqRouter);

apiRouter.use(generationRouter);
