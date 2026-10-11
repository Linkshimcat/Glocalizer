import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { renderWelcomeEmail } from '../emails/welcome-email.js';
import type { UserRow } from '../types/user.js';

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | undefined;

function getTransporter(): Transporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

/** SMTP가 설정되지 않았으면 보내지 않고 false를 돌려준다. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    logger.info({ subject: message.subject }, 'SMTP 미설정으로 메일 발송을 건너뜀');
    return false;
  }
  await transport.sendMail({ from: { name: env.MAIL_FROM_NAME, address: env.SMTP_USER! }, ...message });
  return true;
}

/** 새로 만든 계정에 환영 메일을 보낸다. 가입 흐름을 막지 않도록 실패는 기록만 하고 삼킨다. */
export async function sendWelcomeEmail(user: UserRow): Promise<void> {
  if (!user.email) return;
  try {
    const sent = await sendEmail({ to: user.email, ...renderWelcomeEmail({ name: user.name, siteUrl: env.FRONTEND_ORIGIN }) });
    if (sent) logger.info({ userId: user.id, signupMethod: user.signup_method }, '환영 메일 발송');
  } catch (error) {
    logger.warn({ err: error, userId: user.id }, '환영 메일 발송 실패 (가입은 정상 처리)');
  }
}
