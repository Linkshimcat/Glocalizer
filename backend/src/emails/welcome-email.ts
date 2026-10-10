/** 신규 가입 환영 메일. 서비스 안내만 담고 광고성 문구는 넣지 않는다(정보통신망법상 광고 수신 동의 대상이 아님). */

// 메일 클라이언트는 localhost 이미지를 못 불러오므로 로고는 항상 운영 사이트에서 받는다.
const LOGO_URL = 'https://glocalizer.vercel.app/favicon.png';
// frontend/src/i18n/legal.ts의 LEGAL_CONTACT와 같은 주소.
const SUPPORT_EMAIL = 'veyrix0816@gmail.com';
const BRAND = '#15803d';
const INK = '#191f28';
const SUB = '#56616e';
const SURFACE = '#f2f4f6';

// 문구는 frontend/src/i18n/service.ts(ko)의 주요 기능·안내와 맞춘다.
const FEATURES = [
  { title: '이모티콘 생성', description: '캐릭터 설명과 참고 이미지로 24종 이모티콘을 생성합니다.', path: '/generate', action: '이모티콘 생성하기' },
  { title: '다국어 현지화', description: 'PNG·JPG 이미지의 한국어 문구를 인식하고 영어·일본어·중국어 표현으로 바꿉니다.', path: '/localize', action: '현지화 시작하기' },
  { title: '출시 전 검토', description: 'OGQ 규격과 이미지·문구를 확인합니다.', path: '/review', action: '출시 검토하기' },
] as const;

const NOTICE = '규격 검사와 AI 피드백은 OGQ 공식 심사나 출시 승인이 아닙니다. AI 번역·생성 결과는 직접 확인한 뒤 제출해 주세요.';

export interface WelcomeEmail {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderWelcomeEmail({ name, siteUrl }: { name: string | null; siteUrl: string }): WelcomeEmail {
  const site = siteUrl.replace(/\/+$/, '');
  const displayName = name?.trim() || null;
  const greeting = displayName ? `${displayName}님, 환영합니다` : 'Glocalizer에 오신 것을 환영합니다';
  const subject = 'Glocalizer에 오신 것을 환영합니다';
  const intro = 'Glocalizer에 가입해 주셔서 감사합니다. 이모티콘 생성·다국어 현지화·출시 전 검토를 한곳에서 시작할 수 있어요.';

  const featureRows = FEATURES.map(feature => `
          <tr>
            <td style="padding:0 0 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border-radius:8px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0;font-size:16px;font-weight:700;color:${INK}">${feature.title}</p>
                    <p style="margin:6px 0 10px;font-size:14px;line-height:22px;color:${SUB}">${feature.description}</p>
                    <a href="${site}${feature.path}" style="font-size:14px;font-weight:700;color:${BRAND};text-decoration:none">${feature.action} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`).join('');

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden">이모티콘 생성부터 다국어 현지화, 출시 전 검토까지 한곳에서 시작해 보세요.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafbfc;word-break:keep-all">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e8eb;border-radius:12px">
        <tr>
          <td style="padding:32px 32px 8px">
            <img src="${LOGO_URL}" width="40" height="40" alt="Glocalizer" style="display:block;border:0;border-radius:8px">
            <h1 style="margin:24px 0 0;font-size:24px;line-height:34px;font-weight:800;color:${INK}">${escapeHtml(greeting)}</h1>
            <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:${SUB}">${intro}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0">
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${INK}">이렇게 시작해 보세요</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featureRows}
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 32px 8px">
            <a href="${site}/dashboard" style="display:inline-block;padding:14px 28px;background:${BRAND};border-radius:6px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">워크스페이스 열기</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0">
            <p style="margin:0;font-size:13px;line-height:21px;color:${SUB}">${NOTICE}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px">
            <hr style="margin:0 0 20px;border:0;border-top:1px solid #e5e8eb">
            <p style="margin:0;font-size:13px;line-height:21px;color:${SUB}">사용법과 자주 묻는 질문은 <a href="${site}/service" style="color:${BRAND};font-weight:700;text-decoration:none">서비스 소개</a>에서 볼 수 있어요.<br>궁금한 점은 <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};text-decoration:none">${SUPPORT_EMAIL}</a>로 문의해 주세요.</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;max-width:600px;font-size:12px;line-height:19px;color:#8b95a1">이 메일은 Glocalizer 가입 안내를 위해 발송된 서비스 메일입니다. · <a href="${site}/privacy" style="color:#8b95a1">개인정보처리방침</a></p>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    greeting,
    '',
    intro,
    '',
    '이렇게 시작해 보세요',
    ...FEATURES.map(feature => `- ${feature.title}: ${feature.description} ${site}${feature.path}`),
    '',
    `워크스페이스 열기: ${site}/dashboard`,
    '',
    NOTICE,
    '',
    `사용법과 자주 묻는 질문: ${site}/service`,
    `문의: ${SUPPORT_EMAIL}`,
    '',
    `이 메일은 Glocalizer 가입 안내를 위해 발송된 서비스 메일입니다. 개인정보처리방침: ${site}/privacy`,
  ].join('\n');

  return { subject, html, text };
}
