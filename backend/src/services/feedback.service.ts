import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { findUserById } from '../repositories/user.repository.js';
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

export async function submitFeedback(userId: string, input: FeedbackInput): Promise<FeedbackResult> {
  if (!env.GITHUB_FEEDBACK_TOKEN) {
    throw new AppError('FEEDBACK_NOT_CONFIGURED');
  }

  const user = await findUserById(userId);
  const submitter = user?.email ?? userId;
  const title = input.message.length > TITLE_MAX_LENGTH ? `${input.message.slice(0, TITLE_MAX_LENGTH)}…` : input.message;

  const response = await fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_FEEDBACK_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[${CATEGORY_TITLES[input.category]}] ${title}`,
      body: `${input.message}\n\n---\n제출자: ${submitter}`,
      labels: ['feedback', CATEGORY_LABELS[input.category]],
    }),
  });

  if (!response.ok) {
    throw new AppError('FEEDBACK_SUBMIT_FAILED');
  }

  const data = (await response.json()) as { html_url: string };
  return { issueUrl: data.html_url };
}
