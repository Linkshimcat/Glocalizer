import type { SiteLang } from './translations'

export const studioCopy: Record<SiteLang, { resume: string; newWork: string; projects: string; intro: string }> = {
  ko: { resume: '작업 이어하기', newWork: '새로운 작업 시작하기', projects: '내 작업', intro: '하나의 캐릭터, 여러 언어. 다음 작품을 여기서 시작해 보세요.' },
  en: { resume: 'Continue your work', newWork: 'Start a new project', projects: 'Your work', intro: 'One character, many languages. Start your next creation here.' },
  ja: { resume: '制作を続ける', newWork: '新しい制作を始める', projects: 'あなたの作品', intro: 'ひとつのキャラクター、さまざまな言語。次の作品をここから。' },
  zh: { resume: '继续创作', newWork: '开始新作品', projects: '我的作品', intro: '一个角色，多种语言。在这里开始你的下一个作品。' },
}
