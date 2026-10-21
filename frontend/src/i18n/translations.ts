// 사이트 UI 언어(랜딩·헤더). 이모티콘 번역 대상 언어와는 별개다.
export type SiteLang = 'ko' | 'en' | 'ja' | 'zh'

export const SITE_LANGS: { code: SiteLang; label: string; flag: string; short: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷', short: 'KR' },
  { code: 'en', label: 'English', flag: '🇺🇸', short: 'EN' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', short: 'JP' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
]

export interface Dict {
  commonClose: string

  hubDashboard: string
  hubTitle: string
  hubSubtitle: string
  hubLocalize: string
  hubLocalizeDesc: string
  hubMainBadge: string
  hubReview: string
  hubReviewDesc: string
  hubGenerate: string
  hubGenerateDesc: string
  hubCaption: string
  hubCaptionDesc: string
  hubSoon: string
  hubStart: string
  hubContinue: string
  hubNew: string
  hubConfirm: string
  hubResume: string
  hubSession: string
  hubFiles: string
  hubUpload: string
  hubProcessing: string
  hubEditing: string
  hubResult: string
  hubFailed: string
  privacyPolicy: string
  termsOfService: string

  feedbackMenuLabel: string
  feedbackModalTitle: string
  feedbackModalDesc: string
  feedbackPlaceholder: string
  feedbackSubmit: string
  feedbackSending: string
  feedbackSuccess: string
  feedbackTooShort: string
  feedbackFailed: string
  feedbackCategoryBug: string
  feedbackCategoryFeature: string
  feedbackCategoryOther: string

  navStart: string
  navWorkspace: string
  navSubmenu: string
  navServiceHowTo: string
  navServiceGithub: string
  navService: string
  navPrice: string
  pricingTitle: string
  pricingDescription: string
  pricingWorkspaceCta: string
  heroBrandTag: string
  heroLine1: string
  heroLine2: string
  /** 히어로 2번째 줄에서 굴러가는 어절. LANGUAGES(en·ja·zh) 순서와 맞춘다.
   *  조사가 깨지지 않도록 원어가 아니라 완성된 어절로 넣는다. */
  heroLine2Roll: string[]
  heroDesc: string
  heroCta: string
  heroReplay: string
  landingVideoTitle: string
  landingVideoDescription: string
  landingVideoAutoHint: string
  landingVideoManualHint: string
  beforeAfter: string
  cardTitle: string
  beforeLabel: string
  afterLabel: string
  // OGQ 마켓 연동 — 랜딩 예시 갤러리
  ogqGalleryTitle: string
  ogqGalleryDesc: string
  ogqGalleryUnavailable: string
  ogqGalleryRetry: string
  ogqGalleryCredit: string
  // OGQ 마켓 연동 — 업로드 페이지 샘플 체험
  sampleTryLabel: string
  samplePickerTitle: string
  samplePickerDesc: string
  samplePickerLoading: string
  samplePickerError: string
  samplePickerEmpty: string
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
  dashSpecNotice: string
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
  toastOcrManual: string
  toastAiFailed: string
  toastStatusFail: string
  toastPngFail: string
  toastZipFail: string
  toastDownloadFail: string
  // 404 페이지
  nfTitle: string
  nfDesc: string
  nfHome: string
  // 로그인 / 회원가입
  navLogin: string
  navLogout: string
}

export const translations: Record<SiteLang, Dict> = {
  ko: {
    commonClose: '닫기',

    hubDashboard: "작업실",
    hubTitle: "워크스페이스 대시보드",
    hubSubtitle: "이모티콘 생성·현지화·출시 전 검토를 지원합니다.",
    hubLocalize: '이모티콘 현지화',
    hubLocalizeDesc: "한국어 문구를 영어·일본어·중국어로 변환합니다.",
    hubMainBadge: '메인',
    hubReview: 'OGQ 출시 검토',
    hubReviewDesc: "OGQ 규격과 이미지·문구를 확인합니다.",
    hubCaption: 'AI 문구 추천',
    hubCaptionDesc: "문구 없는 이모티콘에 AI가 어울리는 한국어 문구를 추천합니다.",
    hubGenerate: '이모티콘 생성',
    hubGenerateDesc: "캐릭터와 표정 설명으로 이모티콘을 생성합니다.",
    hubSoon: '준비 중',
    hubStart: '시작하기',
    hubContinue: '이어하기',
    hubNew: '새 작업',
    hubConfirm: '기존 현지화 작업을 지우고 새 작업을 시작할까요?',
    hubResume: '이어서 작업하기',
    hubSession: '이 브라우저 탭에 보관된 현지화 작업이에요.',
    hubFiles: '이미지 {n}개',
    hubUpload: '업로드 중',
    hubProcessing: '처리 중',
    hubEditing: '편집 중',
    hubResult: '결과 준비 완료',
    hubFailed: '확인 필요',
    privacyPolicy: '개인정보처리방침',
    termsOfService: '서비스 이용약관',

    feedbackMenuLabel: '피드백',
    feedbackModalTitle: '피드백 보내기',
    feedbackModalDesc: '메시지는 공개 GitHub 이슈로 등록돼요. 계정 이름과 이메일은 자동으로 첨부하지 않아요. 공개를 원하지 않는 정보는 입력하지 마세요.',
    feedbackPlaceholder: '자유롭게 의견을 남겨주세요 (10자 이상)',
    feedbackSubmit: '보내기',
    feedbackSending: '보내는 중…',
    feedbackSuccess: '피드백을 보냈어요. 감사합니다!',
    feedbackTooShort: '피드백은 10자 이상 입력해주세요.',
    feedbackFailed: '피드백 전송에 실패했어요. 잠시 후 다시 시도해주세요.',
    feedbackCategoryBug: '버그',
    feedbackCategoryFeature: '기능 제안',
    feedbackCategoryOther: '기타',

    navStart: "작업실",
    navWorkspace: "워크스페이스",
    navSubmenu: '하위 메뉴',
    navServiceHowTo: 'Glocalizer 사용법',
    navServiceGithub: 'Glocalizer Github',
    navService: '서비스 소개',
    navPrice: '가격',
    pricingTitle: '가격 페이지는 아직 준비 중이에요',
    pricingDescription: '가격 안내가 준비되면 이 페이지에서 알려드릴게요.',
    pricingWorkspaceCta: '워크스페이스로 돌아가기',
    heroBrandTag: 'Glocalizer',
    heroLine1: "이모티콘을",
    heroLine2: "생성하고 현지화하고 검토하세요",
    heroLine2Roll: ["만드세요", "현지화하세요", "검토하세요", "AI로 추천 받으세요"],
    heroDesc: "이모티콘 생성·현지화·출시 전 검토를 지원합니다.",
    heroCta: "워크스페이스 열기",
    heroReplay: '영상 처음부터 다시 보기',
    landingVideoTitle: "Glocalizer 사용 방법",
    landingVideoDescription: "생성,현지화,검토 과정을 영상으로 확인하세요.",
    landingVideoAutoHint: "화면에 들어오면 음소거로 재생됩니다. 재생 버튼과 탐색 막대로 조작할 수 있습니다.",
    landingVideoManualHint: "재생 버튼을 눌러 시작하세요. 탐색 막대로 원하는 장면으로 이동할 수 있습니다.",
    beforeAfter: 'Before → After',
    cardTitle: '한글 밈이 현지 표현이 돼요',
    beforeLabel: 'Before · 원본',
    afterLabel: 'After · 변환',
    ogqGalleryTitle: "OGQ 스티커 갤러리",
    ogqGalleryDesc: "OGQ 마켓에서 제공하는 무료 스티커입니다.",
    ogqGalleryUnavailable: "스티커를 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
    ogqGalleryRetry: "다시 시도",
    ogqGalleryCredit: 'OGQ 마켓 제공 무료 스티커',
    sampleTryLabel: 'OGQ 스티커',
    samplePickerTitle: '샘플 이모티콘 선택',
    samplePickerDesc: 'OGQ 마켓의 무료 스티커로 먼저 체험해보세요.',
    samplePickerLoading: '샘플을 불러오는 중...',
    samplePickerError: '샘플을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    samplePickerEmpty: '지금은 사용할 수 있는 샘플이 없어요.',
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
    dashSpecNotice: '이모티콘 업로드 규격',
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
    toastOcrManual: '인식된 문구를 확인해주세요. "번역" 탭에서 문구를 확인하고 저장하면 다시 처리돼요.',
    toastAiFailed: 'AI 처리에 실패했어요. 새 작업으로 다시 시도해주세요.',
    toastStatusFail: '처리 상태를 확인하지 못했어요.',
    toastPngFail: 'PNG 다운로드에 실패했어요.',
    toastZipFail: 'ZIP 다운로드에 실패했어요.',
    toastDownloadFail: '다운로드에 실패했어요.',
    nfTitle: '페이지를 찾을 수 없어요',
    nfDesc: '주소가 바뀌었거나 없는 페이지예요.',
    nfHome: '홈으로 돌아가기',
    navLogin: '로그인',
    navLogout: '로그아웃',
  },
  en: {
    commonClose: 'Close',

    hubDashboard: "Studio",
    hubTitle: "Workspace dashboard",
    hubSubtitle: "Create stickers. Localize captions. Review before release.",
    hubLocalize: 'Emoticon localization',
    hubLocalizeDesc: "Adapt Korean captions into English, Japanese and Chinese.",
    hubMainBadge: 'MAIN',
    hubReview: 'OGQ release review',
    hubReviewDesc: "Check OGQ specifications, images and captions.",
    hubCaption: 'AI caption suggestions',
    hubCaptionDesc: "AI suggests a matching Korean caption for stickers with no text.",
    hubGenerate: 'Emoticon generation',
    hubGenerateDesc: "Generate stickers from character and expression descriptions.",
    hubSoon: 'Coming soon',
    hubStart: 'Get started',
    hubContinue: 'Continue',
    hubNew: 'New task',
    hubConfirm: 'Clear your current localization task and start a new one?',
    hubResume: 'Continue your work',
    hubSession: 'This localization task is saved in this browser tab.',
    hubFiles: '{n} images',
    hubUpload: 'Uploading',
    hubProcessing: 'Processing',
    hubEditing: 'Editing',
    hubResult: 'Results ready',
    hubFailed: 'Needs attention',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',

    feedbackMenuLabel: 'Feedback',
    feedbackModalTitle: 'Send feedback',
    feedbackModalDesc: "Your message becomes a public GitHub issue. Your account name and email are not attached automatically. Do not enter private information.",
    feedbackPlaceholder: 'Share your thoughts freely (at least 10 characters)',
    feedbackSubmit: 'Send',
    feedbackSending: 'Sending…',
    feedbackSuccess: 'Thanks for the feedback!',
    feedbackTooShort: 'Feedback must be at least 10 characters.',
    feedbackFailed: 'Failed to send feedback. Please try again shortly.',
    feedbackCategoryBug: 'Bug',
    feedbackCategoryFeature: 'Feature request',
    feedbackCategoryOther: 'Other',

    navStart: "Studio",
    navWorkspace: "Workspace",
    navSubmenu: 'submenu',
    navServiceHowTo: 'How to use Glocalizer',
    navServiceGithub: 'Glocalizer GitHub',
    navService: 'About',
    navPrice: 'Pricing',
    pricingTitle: 'Pricing is coming soon',
    pricingDescription: 'We’ll share pricing details here when they’re ready.',
    pricingWorkspaceCta: 'Back to workspace',
    heroBrandTag: 'Glocalizer',
    heroLine1: "Your stickers",
    heroLine2: "Create, localize and review",
    heroLine2Roll: ["Create them", "Localize them", "Review them", "Get AI recommendations"],
    heroDesc: "Create stickers. Localize captions. Review before release.",
    heroCta: "Open studio",
    heroReplay: 'Replay the video from the start',
    landingVideoTitle: "How Glocalizer works",
    landingVideoDescription: "Watch sticker creation and caption localization.",
    landingVideoAutoHint: "Plays muted when in view. Use the controls to pause or seek.",
    landingVideoManualHint: "Press play to start. Use the seek bar to choose a scene.",
    beforeAfter: 'Before → After',
    cardTitle: 'Korean memes become local expressions',
    beforeLabel: 'Before · Original',
    afterLabel: 'After · Localized',
    ogqGalleryTitle: "OGQ sticker gallery",
    ogqGalleryDesc: "Free stickers from OGQ Market.",
    ogqGalleryUnavailable: "Stickers could not be loaded. Please try again.",
    ogqGalleryRetry: "Try again",
    ogqGalleryCredit: 'Free stickers provided by OGQ Market',
    sampleTryLabel: 'OGQ Stickers',
    samplePickerTitle: 'Choose a sample emoticon',
    samplePickerDesc: 'Try it out first with a free sticker from OGQ Market.',
    samplePickerLoading: 'Loading samples...',
    samplePickerError: "Couldn't load samples. Please try again.",
    samplePickerEmpty: 'No samples are available right now.',
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
    dashSpecNotice: 'Emoji upload specs',
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
    toastOcrManual: 'Please review the detected text. Confirm it in the "Translate" tab and save to reprocess.',
    toastAiFailed: 'AI processing failed. Please try again with a new project.',
    toastStatusFail: 'Could not check the processing status.',
    toastPngFail: 'PNG download failed.',
    toastZipFail: 'ZIP download failed.',
    toastDownloadFail: 'Download failed.',
    nfTitle: 'Page not found',
    nfDesc: 'The page may have moved or no longer exists.',
    nfHome: 'Back to home',
    navLogin: 'Log in',
    navLogout: 'Log out',
  },
  ja: {
    commonClose: '閉じる',

    hubDashboard: "スタジオ",
    hubTitle: "ワークスペースダッシュボード",
    hubSubtitle: "スタンプ生成・ローカライズ・公開前チェックを支援します。",
    hubLocalize: 'スタンプの現地化',
    hubLocalizeDesc: "韓国語の文言を英語・日本語・中国語に変換します。",
    hubMainBadge: 'メイン',
    hubReview: 'OGQリリース確認',
    hubReviewDesc: "OGQの規格と画像・文言を確認します。",
    hubCaption: 'AI文言の提案',
    hubCaptionDesc: "文言のないスタンプに、AIが合う韓国語の文言を提案します。",
    hubGenerate: 'スタンプ生成',
    hubGenerateDesc: "キャラクターと表情の説明からスタンプを生成します。",
    hubSoon: '準備中',
    hubStart: '始める',
    hubContinue: '続ける',
    hubNew: '新しい作業',
    hubConfirm: '現在の現地化作業を削除して、新しく始めますか？',
    hubResume: '作業を続ける',
    hubSession: 'このブラウザータブに保存された現地化作業です。',
    hubFiles: '画像 {n}枚',
    hubUpload: 'アップロード中',
    hubProcessing: '処理中',
    hubEditing: '編集中',
    hubResult: '結果の準備完了',
    hubFailed: '確認が必要',
    privacyPolicy: 'プライバシーポリシー',
    termsOfService: '利用規約',

    feedbackMenuLabel: 'フィードバック',
    feedbackModalTitle: 'フィードバックを送る',
    feedbackModalDesc: 'メッセージは公開GitHubイシューになります。アカウント名とメールアドレスは自動添付しません。非公開にしたい情報は入力しないでください。',
    feedbackPlaceholder: 'ご自由にご意見をお書きください（10文字以上）',
    feedbackSubmit: '送信',
    feedbackSending: '送信中…',
    feedbackSuccess: 'フィードバックを送信しました。ありがとうございます！',
    feedbackTooShort: 'フィードバックは10文字以上入力してください。',
    feedbackFailed: 'フィードバックの送信に失敗しました。しばらくしてから再度お試しください。',
    feedbackCategoryBug: 'バグ',
    feedbackCategoryFeature: '機能提案',
    feedbackCategoryOther: 'その他',

    navStart: "スタジオ",
    navWorkspace: "ワークスペース",
    navSubmenu: 'サブメニュー',
    navServiceHowTo: 'Glocalizerの使い方',
    navServiceGithub: 'Glocalizer GitHub',
    navService: 'サービス紹介',
    navPrice: '料金',
    pricingTitle: '料金ページはただいま準備中です',
    pricingDescription: '料金の詳細が決まり次第、このページでお知らせします。',
    pricingWorkspaceCta: 'ワークスペースに戻る',
    heroBrandTag: 'Glocalizer',
    heroLine1: "スタンプを",
    heroLine2: "生成・ローカライズ・チェック",
    heroLine2Roll: ["生成しましょう", "翻訳しましょう", "確認しましょう", "AIのおすすめを受け取る"],
    heroDesc: "スタンプ生成・ローカライズ・公開前チェックを支援します。",
    heroCta: "スタジオを開く",
    heroReplay: '動画を最初から再生',
    landingVideoTitle: "Glocalizerの使い方",
    landingVideoDescription: "生成と多言語ローカライズの流れをご覧ください。",
    landingVideoAutoHint: "画面に入るとミュートで再生します。再生ボタンとシークバーで操作できます。",
    landingVideoManualHint: "再生ボタンで開始します。シークバーで場面を選べます。",
    beforeAfter: 'Before → After',
    cardTitle: '韓国のミームがローカル表現になります',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 変換',
    ogqGalleryTitle: "OGQスタンプギャラリー",
    ogqGalleryDesc: "OGQマーケット提供の無料スタンプです。",
    ogqGalleryUnavailable: "スタンプを読み込めませんでした。再試行してください。",
    ogqGalleryRetry: "再試行",
    ogqGalleryCredit: 'OGQマーケット提供の無料スティッカー',
    sampleTryLabel: 'OGQステッカー',
    samplePickerTitle: 'サンプル絵文字を選択',
    samplePickerDesc: 'OGQマーケットの無料スティッカーでまず体験してみましょう。',
    samplePickerLoading: 'サンプルを読み込み中...',
    samplePickerError: 'サンプルを読み込めませんでした。しばらくしてから再試行してください。',
    samplePickerEmpty: '現在利用できるサンプルがありません。',
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
    dashSpecNotice: '絵文字アップロード規格',
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
    toastOcrManual: '認識された文言を確認してください。「翻訳」タブで文言を確認して保存すると再処理されます。',
    toastAiFailed: 'AI処理に失敗しました。新しい作業でもう一度お試しください。',
    toastStatusFail: '処理状況を確認できませんでした。',
    toastPngFail: 'PNGのダウンロードに失敗しました。',
    toastZipFail: 'ZIPのダウンロードに失敗しました。',
    toastDownloadFail: 'ダウンロードに失敗しました。',
    nfTitle: 'ページが見つかりません',
    nfDesc: 'アドレスが変わったか、存在しないページです。',
    nfHome: 'ホームに戻る',
    navLogin: 'ログイン',
    navLogout: 'ログアウト',
  },
  zh: {
    commonClose: '关闭',

    hubDashboard: "工作室",
    hubTitle: "工作空间仪表盘",
    hubSubtitle: "支持表情生成、多语言本地化和发布前检查。",
    hubLocalize: '表情本地化',
    hubLocalizeDesc: "将韩语文案转换为英语、日语和中文。",
    hubMainBadge: '主',
    hubReview: 'OGQ发布检查',
    hubReviewDesc: "检查OGQ规格、图片和文案。",
    hubCaption: 'AI文案推荐',
    hubCaptionDesc: "AI会为没有文字的表情推荐合适的韩语文案。",
    hubGenerate: '表情生成',
    hubGenerateDesc: "根据角色和表情描述生成图片。",
    hubSoon: '即将推出',
    hubStart: '开始',
    hubContinue: '继续',
    hubNew: '新建任务',
    hubConfirm: '清除当前本地化任务并开始新任务吗？',
    hubResume: '继续工作',
    hubSession: '此本地化任务保存在当前浏览器标签页中。',
    hubFiles: '{n}张图片',
    hubUpload: '上传中',
    hubProcessing: '处理中',
    hubEditing: '编辑中',
    hubResult: '结果已就绪',
    hubFailed: '需要检查',
    privacyPolicy: '隐私政策',
    termsOfService: '服务条款',

    feedbackMenuLabel: '反馈',
    feedbackModalTitle: '发送反馈',
    feedbackModalDesc: '消息会作为公开 GitHub issue 发布，不会自动附加账号姓名和邮箱。请勿输入不希望公开的信息。',
    feedbackPlaceholder: '请自由留下您的意见（至少10个字）',
    feedbackSubmit: '发送',
    feedbackSending: '发送中…',
    feedbackSuccess: '反馈已发送，谢谢！',
    feedbackTooShort: '反馈至少需要输入10个字。',
    feedbackFailed: '反馈发送失败，请稍后重试。',
    feedbackCategoryBug: '错误',
    feedbackCategoryFeature: '功能建议',
    feedbackCategoryOther: '其他',

    navStart: "工作室",
    navWorkspace: "工作空间",
    navSubmenu: '子菜单',
    navServiceHowTo: 'Glocalizer 使用方法',
    navServiceGithub: 'Glocalizer GitHub',
    navService: '服务介绍',
    navPrice: '价格',
    pricingTitle: '价格页面正在准备中',
    pricingDescription: '价格详情确定后，我们会在此页面公布。',
    pricingWorkspaceCta: '返回工作空间',
    heroBrandTag: 'Glocalizer',
    heroLine1: "让表情",
    heroLine2: "生成、本地化并检查",
    heroLine2Roll: ["生成", "本地化", "检查", "获取 AI 推荐"],
    heroDesc: "支持表情生成、多语言本地化和发布前检查。",
    heroCta: "打开工作室",
    heroReplay: '从头播放视频',
    landingVideoTitle: "Glocalizer 使用方法",
    landingVideoDescription: "观看表情生成与多语言本地化流程。",
    landingVideoAutoHint: "进入视野时静音播放。使用播放按钮和进度条操作。",
    landingVideoManualHint: "点击播放开始。使用进度条选择场景。",
    beforeAfter: 'Before → After',
    cardTitle: '韩国梗变成本地表达',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 转换',
    ogqGalleryTitle: "OGQ 表情图库",
    ogqGalleryDesc: "OGQ Market 提供的免费表情。",
    ogqGalleryUnavailable: "无法加载表情，请重试。",
    ogqGalleryRetry: "重试",
    ogqGalleryCredit: 'OGQ市场提供的免费贴纸',
    sampleTryLabel: 'OGQ贴纸',
    samplePickerTitle: '选择样例表情',
    samplePickerDesc: '先用 OGQ 市场的免费贴纸体验一下吧。',
    samplePickerLoading: '正在加载样例...',
    samplePickerError: '样例加载失败，请稍后重试。',
    samplePickerEmpty: '目前没有可用的样例。',
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
    dashSpecNotice: '表情包上传规格',
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
    toastOcrManual: '请确认识别到的文字。在"翻译"标签中确认文字并保存即可重新处理。',
    toastAiFailed: 'AI 处理失败。请用新任务重试。',
    toastStatusFail: '无法确认处理状态。',
    toastPngFail: 'PNG 下载失败。',
    toastZipFail: 'ZIP 下载失败。',
    toastDownloadFail: '下载失败。',
    nfTitle: '找不到页面',
    nfDesc: '地址可能已更改，或该页面不存在。',
    nfHome: '返回首页',
    navLogin: '登录',
    navLogout: '退出登录',
  },
}
