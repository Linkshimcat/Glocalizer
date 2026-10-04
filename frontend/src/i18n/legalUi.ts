import type { SiteLang } from './translations'

interface LegalUi {
  home: string; effective: string; policies: string; contact: string
  github: string; instagram: string; team: string; school: string; license: string
  copyright: string; hosting: string
  privacy: string; terms: string
  customerSupport: string; footerLinks: string
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
    supportTitle: '무엇을 도와드릴까요?', supportDescription: 'Glocalizer 사용 중 궁금한 점이나 문제가 있으면 이메일로 문의해주세요.', supportEmail: '이메일 문의', supportEmailHint: '문의 내용을 적어 보내주시면 확인 후 답변드릴게요.',
  },
  en: {
    contents: 'Contents', navigation: 'Main navigation', language: 'Choose site language',
    home: 'Home', effective: 'Effective date', policies: 'Policies', contact: 'Contact',
    github: 'Open the Glocalizer GitHub repository', instagram: 'Open Glocalizer on Instagram',
    team: 'Naver OGQ Competition · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister High School · Glocalizer Team', license: 'License',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: 'Hosting: Vercel, Render',
    privacy: 'Privacy Policy', terms: 'Terms of Service', customerSupport: 'Customer support', footerLinks: 'Policies and support',
    supportTitle: 'How can we help?', supportDescription: 'If you have a question or run into an issue while using Glocalizer, contact us by email.', supportEmail: 'Email support', supportEmailHint: 'Send us a message and our team will get back to you.',
  },
  ja: {
    contents: '目次', navigation: 'メインメニュー', language: 'サイト言語を選択',
    home: 'ホームへ', effective: '施行日', policies: 'ポリシー', contact: 'お問い合わせ',
    github: 'GlocalizerのGitHubリポジトリを開く', instagram: 'GlocalizerのInstagramを開く',
    team: 'Naver OGQコンテスト · パク・ソヨン | イ・ユンジェ | チャン・イェナ | キム・レウォン', school: 'ミリムマイスター高校 · Glocalizer Team', license: 'ライセンス',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: 'ホスティング: Vercel, Render',
    privacy: 'プライバシーポリシー', terms: '利用規約', customerSupport: 'サポート', footerLinks: 'ポリシーとサポート',
    supportTitle: 'どのようなお手伝いができますか？', supportDescription: 'Glocalizerの使い方や問題について、メールでお問い合わせください。', supportEmail: 'メールで問い合わせる', supportEmailHint: 'お問い合わせ内容をお送りください。確認のうえご返信します。',
  },
  zh: {
    contents: '目录', navigation: '主菜单', language: '选择网站语言',
    home: '返回首页', effective: '生效日期', policies: '政策', contact: '联系我们',
    github: '打开 Glocalizer GitHub 仓库', instagram: '打开 Glocalizer Instagram 账号',
    team: 'Naver OGQ 大赛 · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister 高中 · Glocalizer Team', license: '许可证',
    copyright: '© 2026 Veyrix. All rights reserved.', hosting: '托管：Vercel、Render',
    privacy: '隐私政策', terms: '服务条款', customerSupport: '客户支持', footerLinks: '政策与支持',
    supportTitle: '需要什么帮助？', supportDescription: '使用 Glocalizer 时如有疑问或遇到问题，请通过电子邮件联系我们。', supportEmail: '邮件联系支持', supportEmailHint: '请发送您的问题，我们确认后会回复。',
  },
}
