export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface JobRow {
  id: string;
  project_id: string;
  status: JobStatus;
  stage: string | null;
  progress: number;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}
