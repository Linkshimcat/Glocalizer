import type { SiteLang } from './translations'

const copy = {
  cloudLogin: ['작업을 클라우드에 저장하려면 로그인해주세요.', 'Please log in to save your work to the cloud.', 'クラウドに保存するにはログインしてください。', '请登录以将任务保存到云端。'],
  cloudSaving: ['클라우드에 저장 중…', 'Saving to cloud…', 'クラウドに保存中…', '正在保存到云端…'],
  cloudSaved: ['계정에 저장됨', 'Saved to your account', 'アカウントに保存済み', '已保存到账户'],
  cloudSaveFailed: ['클라우드 저장에 실패했어요. 다시 시도해주세요.', 'Cloud saving failed. Please try again.', 'クラウドへの保存に失敗しました。再試行してください。', '云端保存失败，请重试。'],
  cloudRetry: ['다시 시도', 'Try again', '再試行', '重试'],
  cloudInProgress: ['진행 중인 작업', 'Work in progress', '進行中の作業', '进行中的任务'],
  cloudArchive: ['워크스페이스 아카이브', 'Work archive', '作業アーカイブ', '任务归档'],
  cloudLocalizationCompleted: ['현지화 완료', 'Localization complete', 'ローカライズ完了', '本地化完成'],
  cloudEmptyProgress: ['진행 중인 작업이 없어요. 현지화나 이모티콘 생성을 시작해보세요.', 'No work in progress. Start localizing or generating emoticons.', '進行中の作業はありません。現地化かスタンプ生成を始めましょう。', '没有进行中的任务，开始本地化或生成表情贴纸吧。'],
  cloudEmptyArchive: ['완료한 작업이 아직 없어요.', 'No finished work yet.', '完了した作業はまだありません。', '暂无已完成的任务。'],
  cloudLoading: ['작업을 불러오는 중…', 'Loading your work…', '作業を読み込み中…', '正在加载任务…'],
  cloudListFailed: ['작업 목록을 불러오지 못했어요.', 'Could not load your work.', '作業を読み込めませんでした。', '无法加载任务列表。'],
  cloudOpen: ['작업 열기', 'Open work', '作業を開く', '打开任务'],
  cloudRecent: ['최근 저장', 'Last saved', '最終保存', '最近保存'],
  cloudNewConfirm: ['현재 작업을 닫고 새 작업을 시작할까요? 클라우드에 저장된 작업은 유지돼요.', 'Close this work and start a new task? Work saved to the cloud will remain.', 'この作業を閉じて新しく始めますか？クラウドに保存した作業は残ります。', '关闭当前任务并新建任务吗？云端已保存的任务会保留。'],
  cloudNewTitle: ['새 작업을 시작할까요?', 'Start a new task?', '新しい作業を始めますか？', '开始新任务？'],
  cloudNewProceed: ['새 작업 시작', 'Start new task', '新しい作業を開始', '开始新任务'],
  cloudDelete: ['삭제', 'Delete', '削除', '删除'],
  cloudDeleteTitle: ['작업을 삭제할까요?', 'Delete this work?', 'この作業を削除しますか？', '删除此任务？'],
  cloudDeleteDescription: ['“{name}” 작업과 저장된 이미지·편집 내용이 모두 사라져요. 삭제하면 되돌릴 수 없어요.', '“{name}” and all saved images and edits will be permanently deleted. This cannot be undone.', '「{name}」と保存された画像・編集内容がすべて削除されます。元に戻すことはできません。', '“{name}”以及已保存的图片和编辑内容将全部删除，且无法恢复。'],
  cloudDeleteConfirm: ['영구 삭제', 'Delete permanently', '完全に削除', '永久删除'],
  cloudDeleteCancel: ['취소', 'Cancel', 'キャンセル', '取消'],
  cloudDeleteSuccess: ['작업을 삭제했어요.', 'Work deleted.', '作業を削除しました。', '任务已删除。'],
  cloudDeleteFailed: ['작업을 삭제하지 못했어요. 다시 시도해주세요.', 'Could not delete this work. Please try again.', '作業を削除できませんでした。再試行してください。', '无法删除任务，请重试。'],
  cloudRename: ['이름 변경', 'Rename', '名前を変更', '重命名'],
  cloudRenameTitle: ['작업 이름 바꾸기', 'Rename this work', '作業名を変更', '重命名任务'],
  cloudRenameLabel: ['작업 이름', 'Work name', '作業名', '任务名称'],
  cloudRenameHint: ['비워두면 기본 이름으로 돌아가요. 최대 60자.', 'Leave empty to restore the default name. Up to 60 characters.', '空にすると既定の名前に戻ります。最大60文字。', '留空将恢复默认名称，最多60个字符。'],
  cloudRenameSave: ['저장', 'Save', '保存', '保存'],
  cloudRenameSuccess: ['이름을 바꿨어요.', 'Name updated.', '名前を変更しました。', '名称已更新。'],
  cloudRenameFailed: ['이름을 바꾸지 못했어요. 다시 시도해주세요.', 'Could not rename this work. Please try again.', '名前を変更できませんでした。もう一度お試しください。', '无法重命名，请重试。'],
} satisfies Record<string, [string, string, string, string]>

export function cloudCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}
