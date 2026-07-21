import { logger } from '../config/logger.js';
import { findExpiredProjects } from '../repositories/project.repository.js';
import { deleteProjectAndAssets } from '../services/project.service.js';

export async function runExpiredProjectsCleanup(): Promise<number> {
  const expired = await findExpiredProjects();

  for (const project of expired) {
    try {
      await deleteProjectAndAssets(project.id);
      logger.info({ projectId: project.id }, '만료된 프로젝트 삭제됨');
    } catch (err) {
      logger.error({ err, projectId: project.id }, '만료된 프로젝트 삭제 실패');
    }
  }

  return expired.length;
}
