import type { SiteLang } from './translations'

const copy = {
  proofPageTitle: ['성능·품질 증빙', 'Performance & quality proof', '性能・品質の根拠', '性能与质量证明'],
  proofPageDesc: ['모든 숫자는 실제 이벤트 기록에서 계산해요. 측정하지 않은 값은 0이 아니라 "측정 안 됨"으로 표시해요.', 'Every number is computed from recorded events. Values that were not measured are shown as "Not measured", never as 0.', 'すべての数値は実際のイベント記録から計算します。測定していない値は0ではなく「未測定」と表示します。', '所有数字都由真实事件记录计算。未测量的值显示为“未测量”，而不是 0。'],
  comingSoon: ['준비 중인 화면이에요.', 'This page is coming soon.', '準備中の画面です。', '页面准备中。'],
  proofMockBanner: ['개발용 목업 데이터예요. 실제 측정값이 아니에요.', 'Development mock data — not real measurements.', '開発用のモックデータです。実際の測定値ではありません。', '开发用模拟数据，并非真实测量值。'],
  proofNotMeasured: ['측정 안 됨', 'Not measured', '未測定', '未测量'],
  proofLoading: ['측정값을 불러오는 중...', 'Loading measurements...', '測定値を読み込み中...', '正在加载测量值...'],
  proofLoadFailed: ['측정값을 불러오지 못했어요.', "Couldn't load measurements.", '測定値を読み込めませんでした。', '测量值加载失败。'],
  proofRetry: ['다시 시도', 'Try again', '再試行', '重试'],
  proofGroups: ['포함할 데이터', 'Data included', '含めるデータ', '包含的数据'],
  proofGroupExternal: ['실사용자', 'Real users', '実ユーザー', '真实用户'],
  proofGroupInternal: ['팀 내부 테스트', 'Internal tests', 'チーム内テスト', '团队内部测试'],
  proofGroupDemo: ['샘플 체험', 'Sample tour', 'サンプル体験', '示例体验'],
  proofGroupsHint: ['기본은 실사용자만 집계해요. 내부 테스트·샘플 체험을 켜면 그 사실이 화면에 함께 표시돼요.', 'By default only real users are counted. Turning on internal tests or the sample tour is shown alongside the numbers.', '既定では実ユーザーのみを集計します。内部テスト・サンプル体験を含めると、その旨が数値と一緒に表示されます。', '默认只统计真实用户。开启内部测试或示例体验后，会在数字旁一并注明。'],
  proofIncludesNonExternal: ['실사용자가 아닌 데이터가 포함된 수치예요.', 'These numbers include data that is not from real users.', '実ユーザー以外のデータを含む数値です。', '这些数字包含非真实用户的数据。'],
  proofCompletionRate: ['변환 완주율', 'Completion rate', '変換完了率', '转换完成率'],
  proofCompletionDef: ['현지화를 시작한 작업 중 결과 파일 다운로드까지 간 비율 (export_succeeded ÷ localization_started)', 'Share of started localizations that reached a result download (export_succeeded ÷ localization_started)', 'ローカライズを開始した作業のうち、結果ファイルのダウンロードまで到達した割合 (export_succeeded ÷ localization_started)', '已开始的本地化中完成结果文件下载的比例 (export_succeeded ÷ localization_started)'],
  proofSampleCount: ['표본 수', 'Sample size', 'サンプル数', '样本数'],
  proofSampleUnit: ['건', 'events', '件', '条'],
  proofPeriod: ['측정 기간', 'Period', '測定期間', '测量期间'],
  proofStagesTitle: ['단계별 처리 시간', 'Processing time by stage', '段階別の処理時間', '各阶段处理时间'],
  proofStagesDesc: ['서버 작업 기록의 시작·종료 시각으로 계산한 값이에요. p50은 절반이 이 시간 안에 끝났다는 뜻이고, p95는 95%가 이 시간 안에 끝났다는 뜻이에요.', 'Computed from start and end timestamps of server jobs. p50 means half finished within this time; p95 means 95% did.', 'サーバー処理の開始・終了時刻から計算した値です。p50は半数がこの時間内に、p95は95%がこの時間内に終わったという意味です。', '根据服务器任务的开始与结束时间计算。p50 表示一半在此时间内完成，p95 表示 95% 在此时间内完成。'],
  proofStage: ['단계', 'Stage', '段階', '阶段'],
  proofStageOcr: ['글자 인식(OCR)', 'Text recognition (OCR)', '文字認識(OCR)', '文字识别(OCR)'],
  proofStageTranslation: ['번역', 'Translation', '翻訳', '翻译'],
  proofStageCleanup: ['배경 정리', 'Background cleanup', '背景の整理', '背景清理'],
  proofStageTotal: ['전체(이미지 1장)', 'Total (per image)', '全体(画像1枚)', '全部(每张图片)'],
  proofCsv: ['원자료 CSV 내려받기', 'Download raw data (CSV)', '元データ(CSV)をダウンロード', '下载原始数据(CSV)'],
  proofCsvDesc: ['개인정보가 없는 이벤트 기록이에요. 이 파일로 화면의 숫자를 직접 다시 계산할 수 있어요.', 'Event records without personal data. You can recompute every number on this page from this file.', '個人情報を含まないイベント記録です。このファイルで画面の数値を自分で再計算できます。', '不含个人信息的事件记录，可用此文件重新计算本页所有数字。'],
  proofCsvFailed: ['원자료를 내려받지 못했어요.', "Couldn't download the raw data.", '元データをダウンロードできませんでした。', '原始数据下载失败。'],
  proofEmpty: ['아직 집계할 이벤트가 없어요.', 'There are no events to summarize yet.', 'まだ集計するイベントがありません。', '暂无可统计的事件。'],
}

export function proofCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type ProofCopy = ReturnType<typeof proofCopy>
