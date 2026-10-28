interface SecurityEmail {
  subject: string;
  html: string;
  text: string;
}

const INK = '#191f28';
const SUB = '#56616e';
const BRAND = '#15803d';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatKoreanDate(value: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short',
  }).format(value);
}

function renderSecurityEmail({ subject, title, message, details, siteUrl }: {
  subject: string;
  title: string;
  message: string;
  details: string[];
  siteUrl: string;
}): SecurityEmail {
  const accountUrl = `${siteUrl.replace(/\/+$/, '')}/account`;
  const detailHtml = details.map(detail => `<li style="margin:0 0 8px">${escapeHtml(detail)}</li>`).join('');
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e8eb;border-radius:12px"><tr><td style="padding:32px">
      <h1 style="margin:0;font-size:22px;line-height:32px">${escapeHtml(title)}</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:24px;color:${SUB}">${escapeHtml(message)}</p>
      <ul style="margin:20px 0;padding-left:20px;font-size:14px;line-height:22px;color:${SUB}">${detailHtml}</ul>
      <a href="${accountUrl}" style="display:inline-block;margin-top:8px;padding:12px 18px;border-radius:6px;background:${BRAND};color:#fff;font-size:14px;font-weight:700;text-decoration:none">계정 보안 설정 열기</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:19px;color:${SUB}">이 메일은 Glocalizer 계정 보안을 위해 발송된 서비스 알림입니다. 계정 설정에서 보안 이메일 알림을 끌 수 있습니다.</p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
  return { subject, html, text: [title, '', message, '', ...details.map(detail => `- ${detail}`), '', `계정 보안 설정: ${accountUrl}`, '', '이 메일은 Glocalizer 계정 보안을 위해 발송된 서비스 알림입니다. 계정 설정에서 보안 이메일 알림을 끌 수 있습니다.'].join('\n') };
}

export function renderNewDeviceLoginEmail({ deviceLabel, ipMasked, siteUrl, occurredAt = new Date() }: {
  deviceLabel: string | null;
  ipMasked: string | null;
  siteUrl: string;
  occurredAt?: Date;
}): SecurityEmail {
  return renderSecurityEmail({
    subject: '새 브라우저에서 Glocalizer에 로그인했어요',
    title: '새 브라우저 로그인 알림',
    message: '등록되지 않은 브라우저에서 계정 로그인에 성공했어요. 본인이 아니라면 계정 보안 설정에서 다른 기기를 로그아웃하세요.',
    details: [`시간: ${formatKoreanDate(occurredAt)}`, `기기: ${deviceLabel ?? '알 수 없는 기기'}`, ...(ipMasked ? [`IP: ${ipMasked}`] : [])],
    siteUrl,
  });
}

export function renderPasswordChangedEmail({ siteUrl, occurredAt = new Date() }: { siteUrl: string; occurredAt?: Date }): SecurityEmail {
  return renderSecurityEmail({
    subject: 'Glocalizer 비밀번호가 변경되었어요',
    title: '비밀번호 변경 완료',
    message: '비밀번호가 변경되어 다른 기기의 로그인 세션이 종료되었어요. 본인이 변경하지 않았다면 즉시 계정 보안 설정을 확인하세요.',
    details: [`시간: ${formatKoreanDate(occurredAt)}`],
    siteUrl,
  });
}

export function renderOtherSessionsSignedOutEmail({ siteUrl, occurredAt = new Date() }: { siteUrl: string; occurredAt?: Date }): SecurityEmail {
  return renderSecurityEmail({
    subject: '다른 기기에서 Glocalizer 로그아웃이 완료되었어요',
    title: '다른 기기 로그아웃 완료',
    message: '현재 기기를 제외한 로그인 세션을 모두 종료했어요.',
    details: [`시간: ${formatKoreanDate(occurredAt)}`],
    siteUrl,
  });
}
