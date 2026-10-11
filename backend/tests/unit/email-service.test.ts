import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

process.env.SMTP_USER = 'sender@gmail.com';
process.env.SMTP_PASS = 'app-password';
process.env.FRONTEND_ORIGIN = 'https://glocalizer.vercel.app';

const { sendWelcomeEmail } = await import('../../src/services/email.service.js');
const nodemailer = (await import('nodemailer')).default;

const user = (patch: object = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'user@example.com',
  password_hash: null,
  naver_id: null,
  supabase_auth_id: null,
  signup_method: 'email' as const,
  name: '소연',
  avatar_url: null,
  name_customized: false,
  avatar_customized: false,
  created_at: '',
  updated_at: '',
  ...patch,
});

// Braces matter: a function returned from beforeEach runs as teardown, and mockReset returns the mock.
beforeEach(() => {
  sendMail.mockReset();
});

describe('sendWelcomeEmail', () => {
  it('sends the welcome email from the configured Gmail account over SMTPS', async () => {
    sendMail.mockResolvedValue({});
    await sendWelcomeEmail(user());
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com', port: 465, secure: true }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      from: { name: 'Glocalizer', address: 'sender@gmail.com' },
      subject: 'Glocalizer에 오신 것을 환영합니다',
      html: expect.stringContaining('https://glocalizer.vercel.app/dashboard'),
    }));
  });

  it('never rejects when SMTP fails, so signup is unaffected', async () => {
    sendMail.mockRejectedValue(new Error('535 auth failed'));
    await expect(sendWelcomeEmail(user())).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('skips accounts without an email address', async () => {
    await sendWelcomeEmail(user({ email: null, signup_method: 'naver' }));
    expect(sendMail).not.toHaveBeenCalled();
  });
});
