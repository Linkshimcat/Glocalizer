import type { SiteLang } from './translations'

export const studioCopy: Record<SiteLang, { resume: string; newWork: string; projects: string; intro: string }> = {
  ko: { resume: '작업 이어하기', newWork: '새로운 작업 시작하기', projects: '내 작업', intro: "생성·현지화·검토 작업을 관리합니다." },
  en: { resume: 'Continue your work', newWork: 'Start a new project', projects: 'Your work', intro: "Manage creation, localization and review projects." },
  ja: { resume: '制作を続ける', newWork: '新しい制作を始める', projects: 'あなたの作品', intro: "生成・ローカライズ・チェックの作業を管理します。" },
  zh: { resume: '继续创作', newWork: '开始新作品', projects: '我的作品', intro: "管理生成、本地化和检查项目。" },
}
