import type { SiteLang } from './translations'

const copy = {
  qaPageTitle: ['QA 검사 결과', 'QA results', 'QA検査結果', 'QA 检查结果'],
  qaPageDesc: ['이미지마다 규격·인식·번역·글자 배치를 검사하고, 판정 근거와 고칠 방법을 보여줘요.', 'Each image is checked for specs, recognition, translation and text layout, with the evidence and how to fix it.', '画像ごとに規格・認識・翻訳・文字配置を検査し、判定の根拠と直し方を表示します。', '逐张检查规格、识别、翻译和文字排版，并显示判定依据与修改方法。'],
  comingSoon: ['준비 중인 화면이에요.', 'This page is coming soon.', '準備中の画面です。', '页面准备中。'],
  qaDisclaimer: ['PASS는 Glocalizer 자체 검사를 통과했다는 뜻이며, OGQ 마켓의 승인이나 심사 합격을 보장하지 않아요.', 'PASS means the image passed Glocalizer’s own checks. It does not guarantee approval by OGQ Market.', 'PASSはGlocalizer独自の検査に合格したという意味で、OGQマーケットの承認や審査合格を保証するものではありません。', 'PASS 表示通过了 Glocalizer 自身的检查，并不保证通过 OGQ 市场的审核。'],
  qaMockBanner: ['개발용 목업 데이터예요. 실제 검사 결과가 아니에요.', 'Development mock data — not real inspection results.', '開発用のモックデータです。実際の検査結果ではありません。', '开发用模拟数据，并非真实检查结果。'],
  qaNoProject: ['검사할 프로젝트가 지정되지 않았어요.', 'No project was selected for inspection.', '検査するプロジェクトが指定されていません。', '未指定要检查的项目。'],
  qaGoProjects: ['내 프로젝트로 가기', 'Go to my projects', 'マイプロジェクトへ', '前往我的项目'],
  qaLoginRequired: ['검사 결과는 로그인 후 볼 수 있어요.', 'Log in to see inspection results.', '検査結果はログイン後に確認できます。', '登录后即可查看检查结果。'],
  qaLogin: ['로그인', 'Log in', 'ログイン', '登录'],
  qaLoading: ['검사 결과를 불러오는 중...', 'Loading inspection results...', '検査結果を読み込み中...', '正在加载检查结果...'],
  qaLoadFailed: ['검사 결과를 불러오지 못했어요.', "Couldn't load inspection results.", '検査結果を読み込めませんでした。', '检查结果加载失败。'],
  qaRetry: ['다시 시도', 'Try again', '再試行', '重试'],
  qaEmpty: ['아직 이 프로젝트를 검사한 기록이 없어요.', 'This project has not been inspected yet.', 'このプロジェクトはまだ検査されていません。', '该项目尚未检查。'],
  qaRun: ['검사 실행', 'Run inspection', '検査を実行', '运行检查'],
  qaRerun: ['다시 검사', 'Inspect again', '再検査', '重新检查'],
  qaRunning: ['검사 중...', 'Inspecting...', '検査中...', '检查中...'],
  qaRunFailed: ['검사를 실행하지 못했어요. 잠시 후 다시 시도해주세요.', "Couldn't run the inspection. Please try again.", '検査を実行できませんでした。しばらくしてから再試行してください。', '无法运行检查，请稍后重试。'],
  qaFilterAll: ['전체', 'All', 'すべて', '全部'],
  qaSeverityPass: ['PASS', 'PASS', 'PASS', 'PASS'],
  qaSeverityReview: ['REVIEW', 'REVIEW', 'REVIEW', 'REVIEW'],
  qaSeverityFail: ['FAIL', 'FAIL', 'FAIL', 'FAIL'],
  qaSeverityPassHint: ['통과', 'Passed', '合格', '通过'],
  qaSeverityReviewHint: ['확인 필요', 'Needs a look', '要確認', '需确认'],
  qaSeverityFailHint: ['수정 필요', 'Needs a fix', '要修正', '需修改'],
  qaFilteredEmpty: ['이 상태의 이미지가 없어요.', 'No images with this status.', 'この状態の画像はありません。', '没有该状态的图片。'],
  qaInspectedAt: ['검사 시각', 'Inspected at', '検査日時', '检查时间'],
  qaRuleset: ['검사 기준 버전', 'Ruleset version', '検査基準バージョン', '检查规则版本'],
  qaHistoryTitle: ['재검사 이력', 'Inspection history', '再検査の履歴', '复检记录'],
  qaHistoryDelta: ['이전 대비 FAIL', 'FAIL vs. previous', '前回比 FAIL', '与上次相比 FAIL'],
  qaDrawerTitle: ['판정 근거', 'Evidence', '判定の根拠', '判定依据'],
  qaDrawerClose: ['닫기', 'Close', '閉じる', '关闭'],
  qaRuleSection: ['규칙 검사', 'Rule checks', 'ルール検査', '规则检查'],
  qaRuleSectionDesc: ['측정값과 기준으로 결정되는 판정이에요.', 'Decided by measured values and fixed criteria.', '測定値と基準で決まる判定です。', '由测量值和固定标准决定的判定。'],
  qaAiSection: ['AI 의견', 'AI suggestions', 'AIの意見', 'AI 意见'],
  qaAiSectionDesc: ['모델이 낸 참고 의견이라 FAIL로 판정하지 않아요. 직접 확인해 주세요.', 'Model output for reference only — never counted as FAIL. Please check it yourself.', 'モデルによる参考意見のため、FAILとは判定しません。ご自身で確認してください。', '模型给出的参考意见，不会判定为 FAIL，请自行确认。'],
  qaUserSection: ['사용자 판단', 'Your decisions', 'ユーザーの判断', '用户判断'],
  qaNoFindings: ['이 이미지에서 발견된 문제가 없어요.', 'No issues were found in this image.', 'この画像で問題は見つかりませんでした。', '这张图片没有发现问题。'],
  qaMeasured: ['측정값', 'Measured', '測定値', '测量值'],
  qaCriterion: ['기준', 'Criterion', '基準', '标准'],
  qaRecommendation: ['조치', 'What to do', '対処', '处理方法'],
  qaFixInEditor: ['에디터에서 고치기', 'Fix in editor', 'エディターで直す', '在编辑器中修改'],
  qaImageCount: ['이미지', 'Images', '画像', '图片'],
}

export function qaCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type QaCopy = ReturnType<typeof qaCopy>
