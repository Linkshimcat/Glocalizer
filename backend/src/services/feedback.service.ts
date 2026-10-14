import { taskFetch } from '../utils/task-context.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { FeedbackInput } from '../schemas/feedback.schema.js';

const FEEDBACK_REPO = 'Linkshimcat/Glocalizer';
const TITLE_MAX_LENGTH = 60;

const CATEGORY_LABELS: Record<FeedbackInput['category'], string> = {
  bug: 'bug',
  feature: 'enhancement',
  other: 'question',
};

const CATEGORY_TITLES: Record<FeedbackInput['category'], string> = {
  bug: '버그',
  feature: '기능 제안',
  other: '기타',
};

interface FeedbackResult {
  issueUrl: string;
}

export async function submitFeedback(_userId: string, input: FeedbackInput): Promise<FeedbackResult> {
  if (!env.GITHUB_FEEDBACK_TOKEN) {
    throw new AppError('FEEDBACK_NOT_CONFIGURED');
  }

  const title = input.message.length > TITLE_MAX_LENGTH ? `${input.message.slice(0, TITLE_MAX_LENGTH)}…` : input.message;

  let response: Response;
  try {
    response = await taskFetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${env.GITHUB_FEEDBACK_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[${CATEGORY_TITLES[input.category]}] ${title}`,
        body: input.message,
        labels: ['feedback', CATEGORY_LABELS[input.category]],
      }),
    });
  } catch {
    throw new AppError('FEEDBACK_SUBMIT_FAILED', undefined, '피드백 전송이 실패하거나 시간이 초과됐습니다.');
  }

  if (!response.ok) {
    throw new AppError('FEEDBACK_SUBMIT_FAILED');
  }

  try {
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('html_url' in data) || typeof data.html_url !== 'string') throw new Error();
    return { issueUrl: data.html_url };
  } catch {
    throw new AppError('FEEDBACK_SUBMIT_FAILED');
  }
}
