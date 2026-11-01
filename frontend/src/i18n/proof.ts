import type { SiteLang } from './translations'

const copy = {
  proofPageTitle: ['성능·품질 증빙', 'Performance & quality proof', '性能・品質の根拠', '性能与质量证明'],
  proofPageDesc: ['모든 숫자는 서버에 기록된 이벤트에서 계산해요. 측정하지 않은 값은 0이 아니라 "측정 안 됨"으로 표시해요.', 'Every number is computed from events recorded on the server. Values that were not measured are shown as "Not measured", never as 0.', 'すべての数値はサーバーに記録されたイベントから計算します。測定していない値は0ではなく「未測定」と表示します。', '所有数字都由服务器记录的事件计算。未测量的值显示为“未测量”，而不是 0。'],
  proofMockBanner: ['개발용 목업 데이터예요. 실제 측정값이 아니에요.', 'Development mock data — not real measurements.', '開発用のモックデータです。実際の測定値ではありません。', '开发用模拟数据，并非真实测量值。'],
  proofNotMeasured: ['측정 안 됨', 'Not measured', '未測定', '未测量'],
  proofLoading: ['측정값을 불러오는 중...', 'Loading measurements...', '測定値を読み込み中...', '正在加载测量值...'],
  proofLoadFailed: ['측정값을 불러오지 못했어요.', "Couldn't load measurements.", '測定値を読み込めませんでした。', '测量值加载失败。'],
  proofRetry: ['다시 시도', 'Try again', '再試行', '重试'],
  proofKeyTitle: ['관리자 키', 'Admin key', '管理者キー', '管理员密钥'],
  proofKeyDesc: ['이 화면은 팀 내부용이에요. 서버의 관리자 키(X-Admin-Key)를 입력해야 집계를 볼 수 있어요. 키는 이 탭에만 저장돼요.', 'This page is for the team. Enter the server admin key (X-Admin-Key) to see the numbers. The key is kept in this tab only.', 'この画面はチーム内部用です。サーバーの管理者キー(X-Admin-Key)を入力すると集計を確認できます。キーはこのタブにのみ保存されます。', '此页面仅供团队内部使用。输入服务器管理员密钥(X-Admin-Key)后才能查看统计。密钥仅保存在当前标签页。'],
  proofKeyPlaceholder: ['관리자 키 입력', 'Enter admin key', '管理者キーを入力', '输入管理员密钥'],
  proofKeySubmit: ['불러오기', 'Load', '読み込む', '加载'],
  proofKeyRequired: ['관리자 키가 없거나 올바르지 않아요.', 'The admin key is missing or incorrect.', '管理者キーがないか、正しくありません。', '管理员密钥缺失或不正确。'],
  proofGroups: ['집계할 데이터', 'Data to summarize', '集計するデータ', '统计的数据'],
  proofGroupExternal: ['실사용자', 'Real users', '実ユーザー', '真实用户'],
  proofGroupInternal: ['팀 내부 테스트', 'Internal tests', 'チーム内テスト', '团队内部测试'],
  proofGroupDemo: ['샘플 체험', 'Sample tour', 'サンプル体験', '示例体验'],
  proofGroupsHint: ['한 번에 한 그룹만 집계해요. 기본은 실사용자이고, 팀 내부 테스트나 샘플 체험을 보면 실사용 성과가 아니라는 안내가 함께 표시돼요.', 'One group is summarized at a time. Real users is the default; internal tests and the sample tour show a notice that they are not real usage.', '一度に1グループだけ集計します。既定は実ユーザーで、内部テストやサンプル体験を選ぶと実利用の成果ではない旨が表示されます。', '每次只统计一个分组。默认是真实用户；选择内部测试或示例体验时会提示这不是真实使用成果。'],
  proofNotExternal: ['실사용자가 아닌 데이터라서 실사용 성과로 쓰면 안 돼요.', 'This is not real-user data, so it must not be reported as real usage.', '実ユーザー以外のデータのため、実利用の成果として使えません。', '这不是真实用户数据，不能作为真实使用成果引用。'],
  proofCompletionRate: ['변환 완주율', 'Completion rate', '変換完了率', '转换完成率'],
  proofCompletionDef: ['현지화를 시작한 프로젝트 중 결과를 내보낸 프로젝트의 비율 (내보낸 프로젝트 ÷ 시작한 프로젝트)', 'Share of started localization projects that exported a result (exported ÷ started projects)', 'ローカライズを開始したプロジェクトのうち、結果を書き出したプロジェクトの割合 (書き出し ÷ 開始)', '已开始的本地化项目中导出结果的比例 (已导出 ÷ 已开始)'],
  proofCompletionCount: ['시작한 {started}개 프로젝트 중 {exported}개를 내보냈어요', 'Exported {exported} of {started} started projects', '開始した{started}件のプロジェクトのうち{exported}件を書き出し', '已开始的 {started} 个项目中导出了 {exported} 个'],
  proofSampleSize: ['표본 (익명 세션)', 'Sample (anonymous sessions)', 'サンプル (匿名セッション)', '样本 (匿名会话)'],
  proofSampleUnit: ['개', 'sessions', '件', '个'],
  proofPeriod: ['측정 기간', 'Period', '測定期間', '测量期间'],
  proofDurationsTitle: ['처리 시간', 'Processing time', '処理時間', '处理时间'],
  proofDurationsDesc: ['p50은 절반이 이 시간 안에 끝났다는 뜻이고, p95는 95%가 이 시간 안에 끝났다는 뜻이에요. 표본 수가 적으면 p95는 참고용이에요.', 'p50 means half finished within this time; p95 means 95% did. With few samples, treat p95 as a rough guide.', 'p50は半数がこの時間内に、p95は95%がこの時間内に終わったという意味です。サンプルが少ない場合p95は参考値です。', 'p50 表示一半在此时间内完成，p95 表示 95% 在此时间内完成。样本少时 p95 仅供参考。'],
  proofEvent: ['항목', 'Item', '項目', '项目'],
  proofSamples: ['표본 수', 'Samples', 'サンプル数', '样本数'],
  proofDurLocalized: ['현지화 처리 (프로젝트 1건 전체)', 'Localization (whole project)', 'ローカライズ処理 (プロジェクト全体)', '本地化处理 (整个项目)'],
  proofDurExport: ['내보내기 준비 (결과 파일 만들기)', 'Export preparation (building the files)', '書き出しの準備 (ファイル作成)', '导出准备 (生成文件)'],
  proofDurExportFailed: ['내보내기 실패까지 걸린 시간', 'Time until an export failed', '書き出し失敗までの時間', '导出失败前耗时'],
  proofEventsTitle: ['이벤트 건수', 'Event counts', 'イベント件数', '事件数量'],
  proofEvDemoStarted: ['샘플 체험 시작', 'Sample tour started', 'サンプル体験の開始', '开始示例体验'],
  proofEvLocStarted: ['현지화 시작', 'Localization started', 'ローカライズ開始', '开始本地化'],
  proofEvLocCompleted: ['현지화 완료', 'Localization completed', 'ローカライズ完了', '本地化完成'],
  proofEvQaReviewed: ['QA 결과 열람', 'QA results viewed', 'QA結果の閲覧', '查看 QA 结果'],
  proofEvExportOk: ['내보내기 성공', 'Export succeeded', '書き出し成功', '导出成功'],
  proofEvExportFail: ['내보내기 실패', 'Export failed', '書き出し失敗', '导出失败'],
  proofCsv: ['원자료 CSV 내려받기', 'Download raw data (CSV)', '元データ(CSV)をダウンロード', '下载原始数据(CSV)'],
  proofCsvDesc: ['개인정보가 없는 이벤트 기록이에요. 이 파일로 화면의 숫자를 직접 다시 계산할 수 있어요.', 'Event records without personal data. You can recompute every number on this page from this file.', '個人情報を含まないイベント記録です。このファイルで画面の数値を自分で再計算できます。', '不含个人信息的事件记录，可用此文件重新计算本页所有数字。'],
  proofCsvFailed: ['원자료를 내려받지 못했어요.', "Couldn't download the raw data.", '元データをダウンロードできませんでした。', '原始数据下载失败。'],
  proofEmpty: ['이 그룹에는 아직 집계할 이벤트가 없어요.', 'This group has no events to summarize yet.', 'このグループにはまだ集計するイベントがありません。', '该分组暂无可统计的事件。'],
}

export function proofCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type ProofCopy = ReturnType<typeof proofCopy>
