const INK = '#191f28';
const SUB = '#56616e';
const BRAND = '#15803d';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatKoreanDate(value: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' }).format(value);
}

/** 내 데이터 받기 링크 메일. 링크는 24시간 동안 쓸 수 있고, 비밀번호를 바꾸거나 탈퇴하면 무효가 된다. */
export function renderDataExportEmail({ downloadUrl, siteUrl, expiresAt }: { downloadUrl: string; siteUrl: string; expiresAt: Date }) {
  const subject = 'Glocalizer 내 데이터 다운로드 링크';
  const accountUrl = `${siteUrl.replace(/\/+$/, '')}/account`;
  const details = [
    `링크 만료: ${formatKoreanDate(expiresAt)} (24시간)`,
    '담긴 내용: 프로필, 프로젝트 원본 이미지와 글자를 지운 이미지, 번역 문구와 편집 설정, 생성한 이모티콘, 로그인·결제 기록',
    '번역 글자까지 합성한 완성 이미지는 설정 페이지의 "내 컴퓨터로 받기"에서 받을 수 있어요.',
    '비밀번호를 바꾸거나 다른 기기에서 로그아웃하거나 계정을 탈퇴하면 이 링크는 더 이상 쓸 수 없어요.',
  ];
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#fafbfc;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e8eb;border-radius:12px"><tr><td style="padding:32px">
      <h1 style="margin:0;font-size:22px;line-height:32px">내 데이터가 준비됐어요</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:24px;color:${SUB}">아래 버튼을 누르면 Glocalizer 계정의 데이터를 ZIP 파일로 받을 수 있어요.</p>
      <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;margin-top:20px;padding:12px 18px;border-radius:6px;background:${BRAND};color:#fff;font-size:14px;font-weight:700;text-decoration:none">내 데이터 받기 (ZIP)</a>
      <ul style="margin:20px 0;padding-left:20px;font-size:14px;line-height:22px;color:${SUB}">${details.map((detail) => `<li style="margin:0 0 8px">${escapeHtml(detail)}</li>`).join('')}</ul>
      <p style="margin:24px 0 0;font-size:12px;line-height:19px;color:${SUB}">직접 요청하지 않았다면 이 메일을 무시하고 <a href="${escapeHtml(accountUrl)}" style="color:${BRAND}">계정 설정</a>에서 비밀번호를 바꿔 주세요. 버튼이 열리지 않으면 아래 주소를 복사해 브라우저에 붙여 넣으세요.<br><span style="word-break:break-all">${escapeHtml(downloadUrl)}</span></p>
    </td></tr></table>
  </td></tr></table>
</body></html>`;
  const text = [
    '내 데이터가 준비됐어요', '',
    '아래 주소에서 Glocalizer 계정의 데이터를 ZIP 파일로 받을 수 있어요.', downloadUrl, '',
    ...details.map((detail) => `- ${detail}`), '',
    `직접 요청하지 않았다면 이 메일을 무시하고 계정 설정에서 비밀번호를 바꿔 주세요: ${accountUrl}`,
  ].join('\n');
  return { subject, html, text };
}
