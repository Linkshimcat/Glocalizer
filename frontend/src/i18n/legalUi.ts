import type { SiteLang } from './translations'

interface LegalUi {
  home: string; effective: string; policies: string; contact: string
  github: string; instagram: string; team: string; school: string; license: string
  copyright: string; hosting: string
  privacy: string; terms: string
  customerSupport: string; footerLinks: string
  useNoticeTitle: string; useNotice: string; useNoticeLink: string
  supportTitle: string; supportDescription: string; supportEmail: string; supportEmailHint: string
  contents: string; navigation: string; language: string
}

export const legalUi: Record<SiteLang, LegalUi> = {
  ko: {
    contents: '목차', navigation: '주요 메뉴', language: '사이트 언어 선택',
    home: '홈으로', effective: '시행일', policies: '정책', contact: '문의',
    github: 'Glocalizer GitHub 저장소 열기', instagram: 'Glocalizer Instagram 계정 열기',
    team: 'Naver OGQ 공모전 · 박소연 | 이윤재 | 장예나 | 김래원', school: '미림마이스터고등학교 · Glocalizer Team', license: '라이선스',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: '호스팅: Vercel, Render',
    privacy: '개인정보처리방침', terms: '서비스 이용약관', customerSupport: '고객 지원', footerLinks: '정책 및 지원',
    useNoticeTitle: '이용 안내',
    useNotice: 'Glocalizer는 AI로 이모티콘을 만들고, 이미지 속 문구를 인식·번역하며, 출시 전 검사를 돕습니다. AI 결과는 틀릴 수 있으니 내보내기 전에 직접 확인해 주세요. 타인의 권리를 침해하는 이미지와 문구는 올리지 마세요. 검사의 PASS는 Glocalizer 자체 기준에 따른 결과이며 OGQ의 승인이 아니고, 제출과 결과물 이용에 대한 확인은 이용자가 합니다.',
    useNoticeLink: '서비스 이용약관에서 자세히 보기',
    supportTitle: '무엇을 도와드릴까요?', supportDescription: 'Glocalizer 사용 중 궁금한 점이나 문제가 있으면 이메일로 문의해주세요.', supportEmail: '이메일 문의', supportEmailHint: '문의 내용을 적어 보내주시면 확인 후 답변드릴게요.',
  },
  en: {
    contents: 'Contents', navigation: 'Main navigation', language: 'Choose site language',
    home: 'Home', effective: 'Effective date', policies: 'Policies', contact: 'Contact',
    github: 'Open the Glocalizer GitHub repository', instagram: 'Open Glocalizer on Instagram',
    team: 'Naver OGQ Competition · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister High School · Glocalizer Team', license: 'License',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: 'Hosting: Vercel, Render',
    privacy: 'Privacy Policy', terms: 'Terms of Service', customerSupport: 'Customer support', footerLinks: 'Policies and support',
    useNoticeTitle: 'Use notice',
    useNotice: 'Glocalizer uses AI to create stickers, recognize and translate text in images, and help check them before release. AI results can be wrong, so please review them before you export. Do not upload images or text that infringe others’ rights. A PASS in our check follows Glocalizer’s own criteria and is not OGQ approval, and you are responsible for confirming submissions and how you use the results.',
    useNoticeLink: 'Read the full Terms of Service',
    supportTitle: 'How can we help?', supportDescription: 'If you have a question or run into an issue while using Glocalizer, contact us by email.', supportEmail: 'Email support', supportEmailHint: 'Send us a message and our team will get back to you.',
  },
  ja: {
    contents: '目次', navigation: 'メインメニュー', language: 'サイト言語を選択',
    home: 'ホームへ', effective: '施行日', policies: 'ポリシー', contact: 'お問い合わせ',
    github: 'GlocalizerのGitHubリポジトリを開く', instagram: 'GlocalizerのInstagramを開く',
    team: 'Naver OGQコンテスト · パク・ソヨン | イ・ユンジェ | チャン・イェナ | キム・レウォン', school: 'ミリムマイスター高校 · Glocalizer Team', license: 'ライセンス',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: 'ホスティング: Vercel, Render',
    privacy: 'プライバシーポリシー', terms: '利用規約', customerSupport: 'サポート', footerLinks: 'ポリシーとサポート',
    useNoticeTitle: 'ご利用にあたって',
    useNotice: 'Glocalizerは、AIでスタンプを作成し、画像内の文言を認識・翻訳し、公開前のチェックを支援します。AIの結果には誤りが含まれる場合があるため、書き出す前にご自身で確認してください。他人の権利を侵害する画像や文言はアップロードしないでください。チェックのPASSはGlocalizer独自の基準による結果でありOGQの承認ではなく、提出や結果の利用に関する確認は利用者が行います。',
    useNoticeLink: '詳しくは利用規約をご確認ください',
    supportTitle: 'どのようなお手伝いができますか？', supportDescription: 'Glocalizerの使い方や問題について、メールでお問い合わせください。', supportEmail: 'メールで問い合わせる', supportEmailHint: 'お問い合わせ内容をお送りください。確認のうえご返信します。',
  },
  zh: {
    contents: '目录', navigation: '主菜单', language: '选择网站语言',
    home: '返回首页', effective: '生效日期', policies: '政策', contact: '联系我们',
    github: '打开 Glocalizer GitHub 仓库', instagram: '打开 Glocalizer Instagram 账号',
    team: 'Naver OGQ 大赛 · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister 高中 · Glocalizer Team', license: '许可证',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: '托管：Vercel、Render',
    privacy: '隐私政策', terms: '服务条款', customerSupport: '客户支持', footerLinks: '政策与支持',
    useNoticeTitle: '使用须知',
    useNotice: 'Glocalizer 使用 AI 生成表情包、识别并翻译图片中的文字，并协助发布前检查。AI 结果可能存在错误，请在导出前自行确认。请勿上传侵犯他人权利的图片或文字。检查中的 PASS 依据 Glocalizer 自身标准，并非 OGQ 批准；提交以及结果的使用由用户自行确认。',
    useNoticeLink: '详见服务条款',
    supportTitle: '需要什么帮助？', supportDescription: '使用 Glocalizer 时如有疑问或遇到问题，请通过电子邮件联系我们。', supportEmail: '邮件联系支持', supportEmailHint: '请发送您的问题，我们确认后会回复。',
  },
}
