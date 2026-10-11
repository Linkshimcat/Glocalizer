import type { SiteLang } from './translations'

export const studioCopy: Record<SiteLang, { resume: string; newWork: string; projects: string; intro: string; loginMessage: string; emptyProgress: string }> = {
  ko: { resume: '작업 이어하기', newWork: '새로운 워크스페이스 시작하기', projects: '내 워크스페이스', intro: "생성·현지화·검토 작업을 관리합니다.", loginMessage: '워크스페이스를 클라우드에 저장하려면 로그인해주세요.', emptyProgress: '진행 중인 워크스페이스가 없어요. 현지화나 이모티콘 생성을 시작해보세요.' },
  en: { resume: 'Continue your work', newWork: 'Start a new workspace', projects: 'My workspace', intro: "Manage creation, localization and review projects.", loginMessage: 'Log in to save your workspace to the cloud.', emptyProgress: 'No workspaces in progress. Start localizing or creating stickers.' },
  ja: { resume: '制作を続ける', newWork: '新しいワークスペースを始める', projects: 'マイワークスペース', intro: "生成・ローカライズ・チェックの作業を管理します。", loginMessage: 'ワークスペースをクラウドに保存するにはログインしてください。', emptyProgress: '進行中のワークスペースはありません。ローカライズかスタンプ生成を始めましょう。' },
  zh: { resume: '继续创作', newWork: '开始新的工作空间', projects: '我的工作空间', intro: "管理生成、本地化和检查项目。", loginMessage: '登录后即可将工作空间保存到云端。', emptyProgress: '没有进行中的工作空间。开始本地化或生成表情贴纸吧。' },
}
