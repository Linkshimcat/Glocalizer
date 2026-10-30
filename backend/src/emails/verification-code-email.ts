import type { VerificationPurpose } from '../utils/verification-code.js';

const INK = '#191f28';
const SUB = '#56616e';
const BRAND = '#15803d';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ACTION: Record<VerificationPurpose, string> = {
  'delete-account': '계정 탈퇴',
  'change-password': '비밀번호 변경',
};

/** 탈퇴·비밀번호 변경 전에 본인 확인용 6자리 코드를 보낸다. 코드는 10분 동안 쓸 수 있다. */
export function renderVerificationCodeEmail({ code, purpose, siteUrl, ttlMinutes }: { code: string; purpose: VerificationPurpose; siteUrl: string; ttlMinutes: number }) {
  const action = ACTION[purpose];
  const subject = `[Glocalizer] ${action} 인증코드`;
  const accountUrl = `${siteUrl.replace(/\/+$/, '')}/account`;
  const message = `${action}을(를) 진행하려면 아래 인증코드를 입력해 주세요. 코드는 ${ttlMinutes}분 동안 쓸 수 있어요.`;
  const warning = '직접 요청하지 않았다면 누군가 계정에 로그인해 있을 수 있어요. 이 코드를 아무에게도 알려주지 말고, 계정 설정에서 비밀번호를 바꾸고 다른 기기를 로그아웃해 주세요.';
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e8eb;border-radius:12px"><tr><td style="padding:32px">
      <h1 style="margin:0;font-size:22px;line-height:32px">${escapeHtml(action)} 인증코드</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:24px;color:${SUB}">${escapeHtml(message)}</p>
      <p style="margin:24px 0;padding:16px;border-radius:8px;background:#f2f4f6;text-align:center;font-size:32px;line-height:40px;font-weight:800;letter-spacing:8px;color:${BRAND}">${escapeHtml(code)}</p>
      <p style="margin:0;font-size:12px;line-height:19px;color:${SUB}">${escapeHtml(warning)} <a href="${escapeHtml(accountUrl)}" style="color:${BRAND}">계정 설정 열기</a></p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
  const text = [`${action} 인증코드`, '', message, '', code, '', warning, `계정 설정: ${accountUrl}`].join('\n');
  return { subject, html, text };
}
