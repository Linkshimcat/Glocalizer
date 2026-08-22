import { countDownloadEvents, insertDownloadEvent, type DownloadKind, type DownloadStats } from '../repositories/download.repository.js';

export async function recordDownload(projectId: string, kind: DownloadKind, languageCode?: string): Promise<void> {
  await insertDownloadEvent(projectId, kind, languageCode ?? null);
}

export async function getDownloadStats(): Promise<DownloadStats> {
  return countDownloadEvents();
}
