// 사이트 UI 언어(랜딩·헤더). 이모티콘 번역 대상 언어와는 별개다.
export type SiteLang = 'ko' | 'en' | 'ja' | 'zh'

export const SITE_LANGS: { code: SiteLang; label: string; flag: string; short: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷', short: 'KR' },
  { code: 'en', label: 'English', flag: '🇺🇸', short: 'EN' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', short: 'JP' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
]

export interface Dict {
  navStart: string
  navService: string
  heroBrandTag: string
  heroLine1: string
  heroLine2: string
  heroDesc: string
  heroCta: string
  beforeAfter: string
  cardTitle: string
  beforeLabel: string
  afterLabel: string
  langCountSuffix: string // "{n}개 언어" 뒤에 붙는 문구
  langCountUnit: string // 숫자 뒤 단위 ("개 언어" 등)
  // 진행 단계 (헤더 공통)
  stepUpload: string
  stepEdit: string
  stepDownload: string
  // 결과 화면
  resultDone: string
  resultDesc1: string // {lang} 치환
  resultDesc2: string
  resultPreviewTitle: string
  resultNoText: string
  resultBackEditor: string
  resultToMain: string
  resultRestart: string
  // 대시보드(업로드)
  dashStep1: string
  dashTitle: string
  dashSubtitle: string
  dashAiNotice: string
  dashDropTitle: string
  dashDropMulti: string
  dashSelectFile: string
  dashUploading: string
  dashUploadDone: string
  dashSelectedCount: string // {n}
  dashListTitlePre: string // "번역할 이모티콘 " (숫자 앞)
  dashListTitlePost: string // "장" (숫자 뒤)
  dashSelectAll: string
  dashDeselectAll: string
  dashDeleteSelected: string // "선택 삭제" (뒤에 (n))
  dashLangTitle: string
  dashLangHint: string
  dashCollapse: string
  dashMore: string // {n}
  dashStart: string // {n}
  dashStartEmpty: string
  dashHintNoFile: string
  dashHintNoSelect: string
  dashHintNoLang: string
  dashHintReady: string
  dashToastFormat: string
  dashToastStartFail: string
  // 로딩(처리 중) 화면 + 에디터 토스트
  loadingStep1: string
  loadingStep2: string
  loadingSub: string
  loadingCancel: string
  toastCleanupManual: string
  toastAiFailed: string
  toastStatusFail: string
  toastPngFail: string
  toastZipFail: string
  toastDownloadFail: string
  // 404 페이지
  nfTitle: string
  nfDesc: string
  nfHome: string
}

export const translations: Record<SiteLang, Dict> = {
  ko: {
    navStart: '시작하기',
    navService: '서비스 소개',
    heroBrandTag: 'Glocalizer',
    heroLine1: '한국 밈을',
    heroLine2: '전 세계 언어로',
    heroDesc: '이모티콘 속 한글을 자연스러운 현지 표현으로 바꿔드려요.',
    heroCta: '무료로 시작하기',
    beforeAfter: 'Before → After',
    cardTitle: '한글 밈이 현지 표현이 돼요',
    beforeLabel: 'Before · 원본',
    afterLabel: 'After · 변환',
    langCountUnit: '개 언어',
    langCountSuffix: '로 바로 바꿔보세요',
    stepUpload: '업로드',
    stepEdit: '편집',
    stepDownload: '다운로드',
    resultDone: '현지화가 끝났어요!',
    resultDesc1: '이모티콘이 {lang}(으)로 번역완료.',
    resultDesc2: '다운로드가 시작됐는지 확인해보세요.',
    resultPreviewTitle: '번역 결과 미리보기',
    resultNoText: '텍스트 없음',
    resultBackEditor: '에디터로 돌아가기',
    resultToMain: '메인으로',
    resultRestart: '새로 시작하기',
    dashStep1: '1단계 · 업로드',
    dashTitle: '이모티콘을 올려주세요',
    dashSubtitle: 'PNG, JPG 파일을 끌어다 놓으면 바로 시작할 수 있어요.',
    dashAiNotice: 'AI 로컬라이징이 적용됨',
    dashDropTitle: '파일을 여기에 끌어다 놓으세요',
    dashDropMulti: '여러 장을 한 번에 올릴 수 있어요',
    dashSelectFile: '파일 선택',
    dashUploading: '올리는 중이에요…',
    dashUploadDone: '업로드 완료!',
    dashSelectedCount: '{n}장을 번역 대상으로 골랐어요.',
    dashListTitlePre: '번역할 이모티콘 ',
    dashListTitlePost: '장',
    dashSelectAll: '전체 선택',
    dashDeselectAll: '선택 해제',
    dashDeleteSelected: '선택 삭제',
    dashLangTitle: '번역할 언어를 골라주세요',
    dashLangHint: '여러 개도 좋아요',
    dashCollapse: '접기',
    dashMore: '+ {n}개 더보기',
    dashStart: '{n}장 번역 시작하기 →',
    dashStartEmpty: '번역 시작하기 →',
    dashHintNoFile: '이모티콘을 먼저 올려주세요.',
    dashHintNoSelect: '번역할 이모티콘을 골라주세요.',
    dashHintNoLang: '번역할 언어를 골라주세요.',
    dashHintReady: '편집 화면에서 번역 문구와 폰트를 다듬을 수 있어요.',
    dashToastFormat: 'PNG · JPG 이미지만 올릴 수 있어요.',
    dashToastStartFail: '업로드를 시작하지 못했어요.',
    loadingStep1: '번역할 밈을 찾고 있어요…',
    loadingStep2: '자연스러운 표현을 고르고 있어요…',
    loadingSub: 'AI 서버 상황에 따라 최대 몇 분 정도 걸릴 수 있어요',
    loadingCancel: '취소하고 대시보드로 돌아가기',
    toastCleanupManual: '배경이 복잡해서 자동으로 못 지웠어요. "스타일" 탭의 "원문 지우기" 도구로 직접 지워주세요.',
    toastAiFailed: 'AI 처리에 실패했어요. 새 작업으로 다시 시도해주세요.',
    toastStatusFail: '처리 상태를 확인하지 못했어요.',
    toastPngFail: 'PNG 다운로드에 실패했어요.',
    toastZipFail: 'ZIP 다운로드에 실패했어요.',
    toastDownloadFail: '다운로드에 실패했어요.',
    nfTitle: '페이지를 찾을 수 없어요',
    nfDesc: '주소가 바뀌었거나 없는 페이지예요.',
    nfHome: '홈으로 돌아가기',
  },
  en: {
    navStart: 'Start',
    navService: 'About',
    heroBrandTag: 'Glocalizer',
    heroLine1: 'Korean memes,',
    heroLine2: 'in every language',
    heroDesc: 'We turn the Korean text in your emojis into natural local expressions.',
    heroCta: 'Start for free',
    beforeAfter: 'Before → After',
    cardTitle: 'Korean memes become local expressions',
    beforeLabel: 'Before · Original',
    afterLabel: 'After · Localized',
    langCountUnit: ' languages',
    langCountSuffix: ' at your fingertips',
    stepUpload: 'Upload',
    stepEdit: 'Edit',
    stepDownload: 'Download',
    resultDone: 'Localization complete!',
    resultDesc1: 'Your emojis are now in {lang}.',
    resultDesc2: 'Check that the download has started.',
    resultPreviewTitle: 'Translation preview',
    resultNoText: 'No text',
    resultBackEditor: 'Back to editor',
    resultToMain: 'Home',
    resultRestart: 'Start over',
    dashStep1: 'Step 1 · Upload',
    dashTitle: 'Upload your emojis',
    dashSubtitle: 'Drag and drop PNG or JPG files to get started.',
    dashAiNotice: 'AI localization enabled',
    dashDropTitle: 'Drag files here',
    dashDropMulti: 'You can upload several at once',
    dashSelectFile: 'Choose files',
    dashUploading: 'Uploading…',
    dashUploadDone: 'Upload complete!',
    dashSelectedCount: '{n} selected for translation.',
    dashListTitlePre: 'Emojis to translate: ',
    dashListTitlePost: '',
    dashSelectAll: 'Select all',
    dashDeselectAll: 'Deselect all',
    dashDeleteSelected: 'Delete selected',
    dashLangTitle: 'Choose target languages',
    dashLangHint: 'Pick as many as you like',
    dashCollapse: 'Collapse',
    dashMore: '+ {n} more',
    dashStart: 'Translate {n} →',
    dashStartEmpty: 'Start translating →',
    dashHintNoFile: 'Please upload an emoji first.',
    dashHintNoSelect: 'Please pick emojis to translate.',
    dashHintNoLang: 'Please choose target languages.',
    dashHintReady: 'You can refine text and fonts in the editor.',
    dashToastFormat: 'Only PNG · JPG images are supported.',
    dashToastStartFail: 'Could not start the upload.',
    loadingStep1: 'Finding the meme to translate…',
    loadingStep2: 'Choosing natural expressions…',
    loadingSub: 'Depending on AI server load, this can take up to a few minutes',
    loadingCancel: 'Cancel and return to dashboard',
    toastCleanupManual: 'The background is too complex to erase automatically. Use the "Erase original" tool in the "Style" tab.',
    toastAiFailed: 'AI processing failed. Please try again with a new project.',
    toastStatusFail: 'Could not check the processing status.',
    toastPngFail: 'PNG download failed.',
    toastZipFail: 'ZIP download failed.',
    toastDownloadFail: 'Download failed.',
    nfTitle: 'Page not found',
    nfDesc: 'The page may have moved or no longer exists.',
    nfHome: 'Back to home',
  },
  ja: {
    navStart: 'はじめる',
    navService: 'サービス紹介',
    heroBrandTag: 'Glocalizer',
    heroLine1: '韓国のミームを',
    heroLine2: '世界の言語へ',
    heroDesc: '絵文字の中の韓国語を、自然なローカル表現に変換します。',
    heroCta: '無料ではじめる',
    beforeAfter: 'Before → After',
    cardTitle: '韓国のミームがローカル表現になります',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 変換',
    langCountUnit: '言語',
    langCountSuffix: 'にすぐ変換できます',
    stepUpload: 'アップロード',
    stepEdit: '編集',
    stepDownload: 'ダウンロード',
    resultDone: 'ローカライズ完了！',
    resultDesc1: '絵文字を{lang}に翻訳しました。',
    resultDesc2: 'ダウンロードが始まったか確認してください。',
    resultPreviewTitle: '翻訳結果プレビュー',
    resultNoText: 'テキストなし',
    resultBackEditor: 'エディターに戻る',
    resultToMain: 'ホームへ',
    resultRestart: '新しく始める',
    dashStep1: 'ステップ1 · アップロード',
    dashTitle: '絵文字をアップロード',
    dashSubtitle: 'PNG・JPGファイルをドラッグ&ドロップですぐ始められます。',
    dashAiNotice: 'AIローカライズを使用',
    dashDropTitle: 'ここにファイルをドロップ',
    dashDropMulti: '複数枚を一度にアップロードできます',
    dashSelectFile: 'ファイルを選択',
    dashUploading: 'アップロード中…',
    dashUploadDone: 'アップロード完了！',
    dashSelectedCount: '{n}枚を翻訳対象に選びました。',
    dashListTitlePre: '翻訳する絵文字 ',
    dashListTitlePost: '枚',
    dashSelectAll: 'すべて選択',
    dashDeselectAll: '選択解除',
    dashDeleteSelected: '選択削除',
    dashLangTitle: '翻訳する言語を選んでください',
    dashLangHint: '複数選んでもOK',
    dashCollapse: '折りたたむ',
    dashMore: '+ {n}件もっと見る',
    dashStart: '{n}枚を翻訳する →',
    dashStartEmpty: '翻訳を始める →',
    dashHintNoFile: 'まず絵文字をアップロードしてください。',
    dashHintNoSelect: '翻訳する絵文字を選んでください。',
    dashHintNoLang: '翻訳する言語を選んでください。',
    dashHintReady: 'エディターで文言とフォントを調整できます。',
    dashToastFormat: 'PNG・JPG画像のみアップロードできます。',
    dashToastStartFail: 'アップロードを開始できませんでした。',
    loadingStep1: '翻訳するミームを探しています…',
    loadingStep2: '自然な表現を選んでいます…',
    loadingSub: 'AIサーバーの状況により、最大数分ほどかかることがあります',
    loadingCancel: 'キャンセルしてダッシュボードに戻る',
    toastCleanupManual: '背景が複雑で自動で消せませんでした。「スタイル」タブの「原文消去」ツールで直接消してください。',
    toastAiFailed: 'AI処理に失敗しました。新しい作業でもう一度お試しください。',
    toastStatusFail: '処理状況を確認できませんでした。',
    toastPngFail: 'PNGのダウンロードに失敗しました。',
    toastZipFail: 'ZIPのダウンロードに失敗しました。',
    toastDownloadFail: 'ダウンロードに失敗しました。',
    nfTitle: 'ページが見つかりません',
    nfDesc: 'アドレスが変わったか、存在しないページです。',
    nfHome: 'ホームに戻る',
  },
  zh: {
    navStart: '开始',
    navService: '服务介绍',
    heroBrandTag: 'Glocalizer',
    heroLine1: '把韩国梗',
    heroLine2: '变成全球语言',
    heroDesc: '将表情包里的韩文转换成自然的本地表达。',
    heroCta: '免费开始',
    beforeAfter: 'Before → After',
    cardTitle: '韩国梗变成本地表达',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 转换',
    langCountUnit: '种语言',
    langCountSuffix: '一键转换',
    stepUpload: '上传',
    stepEdit: '编辑',
    stepDownload: '下载',
    resultDone: '本地化完成！',
    resultDesc1: '表情包已翻译成{lang}。',
    resultDesc2: '请确认下载是否已开始。',
    resultPreviewTitle: '翻译结果预览',
    resultNoText: '无文字',
    resultBackEditor: '返回编辑器',
    resultToMain: '返回主页',
    resultRestart: '重新开始',
    dashStep1: '第1步 · 上传',
    dashTitle: '上传你的表情包',
    dashSubtitle: '拖入 PNG、JPG 文件即可开始。',
    dashAiNotice: '已启用 AI 本地化',
    dashDropTitle: '将文件拖到这里',
    dashDropMulti: '可以一次上传多张',
    dashSelectFile: '选择文件',
    dashUploading: '上传中…',
    dashUploadDone: '上传完成！',
    dashSelectedCount: '已选择{n}张进行翻译。',
    dashListTitlePre: '要翻译的表情包 ',
    dashListTitlePost: '张',
    dashSelectAll: '全选',
    dashDeselectAll: '取消全选',
    dashDeleteSelected: '删除所选',
    dashLangTitle: '请选择翻译语言',
    dashLangHint: '可多选',
    dashCollapse: '收起',
    dashMore: '+ 再看{n}个',
    dashStart: '翻译{n}张 →',
    dashStartEmpty: '开始翻译 →',
    dashHintNoFile: '请先上传表情包。',
    dashHintNoSelect: '请选择要翻译的表情包。',
    dashHintNoLang: '请选择翻译语言。',
    dashHintReady: '可在编辑器中调整文字和字体。',
    dashToastFormat: '仅支持 PNG · JPG 图片。',
    dashToastStartFail: '无法开始上传。',
    loadingStep1: '正在寻找要翻译的梗图…',
    loadingStep2: '正在挑选自然的表达…',
    loadingSub: '视 AI 服务器情况，最多可能需要几分钟',
    loadingCancel: '取消并返回仪表板',
    toastCleanupManual: '背景较复杂，无法自动擦除。请用“样式”标签的“擦除原文”工具手动擦除。',
    toastAiFailed: 'AI 处理失败。请用新任务重试。',
    toastStatusFail: '无法确认处理状态。',
    toastPngFail: 'PNG 下载失败。',
    toastZipFail: 'ZIP 下载失败。',
    toastDownloadFail: '下载失败。',
    nfTitle: '找不到页面',
    nfDesc: '地址可能已更改，或该页面不存在。',
    nfHome: '返回首页',
  },
}
