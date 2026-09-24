import type { SiteLang } from './translations'

interface LegalUi {
  home: string; effective: string; policies: string; contact: string
  github: string; instagram: string; team: string; school: string; license: string
  privacy: string; terms: string
}

export const legalUi: Record<SiteLang, LegalUi> = {
  ko: {
    home: '홈으로', effective: '시행일', policies: '정책', contact: '문의',
    github: 'Glocalizer GitHub 저장소 열기', instagram: 'Glocalizer Instagram 계정 열기',
    team: 'Naver OGQ 공모전 · 박소연 | 이윤재 | 장예나 | 김래원', school: '미림마이스터고등학교 · Glocalizer Team', license: '라이선스',
    privacy: '개인정보처리방침', terms: '서비스 이용약관',
  },
  en: {
    home: 'Home', effective: 'Effective date', policies: 'Policies', contact: 'Contact',
    github: 'Open the Glocalizer GitHub repository', instagram: 'Open Glocalizer on Instagram',
    team: 'Naver OGQ Competition · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister High School · Glocalizer Team', license: 'License',
    privacy: 'Privacy Policy', terms: 'Terms of Service',
  },
  ja: {
    home: 'ホームへ', effective: '施行日', policies: 'ポリシー', contact: 'お問い合わせ',
    github: 'GlocalizerのGitHubリポジトリを開く', instagram: 'GlocalizerのInstagramを開く',
    team: 'Naver OGQコンテスト · パク・ソヨン | イ・ユンジェ | チャン・イェナ | キム・レウォン', school: 'ミリムマイスター高校 · Glocalizer Team', license: 'ライセンス',
    privacy: 'プライバシーポリシー', terms: '利用規約',
  },
  zh: {
    home: '返回首页', effective: '生效日期', policies: '政策', contact: '联系我们',
    github: '打开 Glocalizer GitHub 仓库', instagram: '打开 Glocalizer Instagram 账号',
    team: 'Naver OGQ 大赛 · Soyeon Park | Yunjae Lee | Yena Jang | Raewon Kim', school: 'Mirim Meister 高中 · Glocalizer Team', license: '许可证',
    privacy: '隐私政策', terms: '服务条款',
  },
}
