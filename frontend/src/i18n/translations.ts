// 사이트 UI 언어(랜딩·헤더). 이모티콘 번역 대상 언어와는 별개다.
export type SiteLang = 'ko' | 'en' | 'ja' | 'zh'

export const SITE_LANGS: { code: SiteLang; label: string; flag: string; short: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷', short: 'KR' },
  { code: 'en', label: 'English', flag: '🇺🇸', short: 'EN' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', short: 'JP' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
]

export interface Dict {
  cloudLogin: string
  cloudSaving: string
  cloudSaved: string
  cloudSaveFailed: string
  cloudRetry: string
  cloudInProgress: string
  cloudArchive: string
  cloudEmptyProgress: string
  cloudEmptyArchive: string
  cloudLoading: string
  cloudListFailed: string
  cloudOpen: string
  cloudRecent: string
  cloudNewConfirm: string
  cloudNewTitle: string
  cloudNewProceed: string
  cloudDelete: string
  cloudDeleteTitle: string
  cloudDeleteDescription: string
  cloudDeleteConfirm: string
  cloudDeleteCancel: string
  cloudDeleteSuccess: string
  cloudDeleteFailed: string
  commonClose: string

  hubDashboard: string
  hubTitle: string
  hubSubtitle: string
  hubLocalize: string
  hubLocalizeDesc: string
  hubReview: string
  hubReviewDesc: string
  hubGenerate: string
  hubGenerateDesc: string
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
  accountTitle: string
  accountDesc: string
  accountName: string
  accountEmail: string
  accountSignupMethod: string
  accountEmailLogin: string
  accountNaverLogin: string
  accountGoogleLogin: string
  accountChecking: string
  accountMissing: string
  accountMenu: string
  accountEdit: string
  accountSave: string
  accountCancel: string
  accountChangePhoto: string
  accountRemovePhoto: string
  accountNameRequired: string
  accountSaved: string
  accountSaveFailed: string
  accountPhotoInvalid: string
  accountDangerZoneTitle: string
  accountDangerZoneDesc: string
  accountDeleteButton: string
  accountDeleteConfirm: string
  accountDeleteFailed: string
  accountDeleteSuccess: string
  accountDeleteProcessingTitle: string
  accountDeleteProcessingDesc: string
  accountSecurityTitle: string
  accountSecurityDesc: string
  accountPasswordChangeCta: string
  accountPasswordCurrentLabel: string
  accountPasswordNewLabel: string
  accountPasswordConfirmLabel: string
  accountPasswordSubmit: string
  accountPasswordCurrentRequired: string
  accountPasswordTooShort: string
  accountPasswordMismatch: string
  accountPasswordSuccess: string
  accountPasswordFailed: string
  accountDeleteModalTitle: string
  accountDeleteAckData: string
  accountDeleteAckResignup: string
  accountDeleteConfirmCta: string
  accountPolicyTitle: string
  accountPolicyDesc: string
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
  navService: string
  heroBrandTag: string
  heroLine1: string
  heroLine2: string
  /** 히어로 2번째 줄에서 굴러가는 어절. LANGUAGES(en·ja·zh) 순서와 맞춘다.
   *  조사가 깨지지 않도록 원어가 아니라 완성된 어절로 넣는다. */
  heroLine2Roll: string[]
  heroDesc: string
  heroCta: string
  heroReplay: string
  beforeAfter: string
  cardTitle: string
  beforeLabel: string
  afterLabel: string
  // OGQ 마켓 연동 — 랜딩 예시 갤러리
  ogqGalleryTitle: string
  ogqGalleryDesc: string
  ogqGalleryCredit: string
  // OGQ 마켓 연동 — 업로드 페이지 샘플 체험
  sampleTryLabel: string
  samplePickerTitle: string
  samplePickerDesc: string
  samplePickerLoading: string
  samplePickerError: string
  samplePickerEmpty: string
  // OGQ 마켓 연동 — 출시 검토(Review) 페이지
  reviewPickProjectTitle: string
  reviewPickProjectDesc: string
  reviewProjectsLoading: string
  reviewProjectsEmpty: string
  reviewProjectsEmptyCta: string
  reviewProjectsFailed: string
  reviewLoadingWorkspace: string
  reviewWorkspaceFailed: string
  reviewSimilarTitle: string
  reviewSimilarDesc: string
  reviewNoKeywords: string
  reviewKeywordEmpty: string
  reviewKeywordFailed: string
  reviewAnimatedBadge: string
  reviewAiTitle: string
  reviewAiDesc: string
  reviewAiCta: string
  reviewAiLoading: string
  reviewAiFailed: string
  reviewAiLimit: string
  reviewAiScore: string
  reviewAiStrengths: string
  reviewAiFixes: string
  reviewAiImages: string
  reviewAiLocalization: string
  reviewChecklistTitle: string
  reviewChecklistItems: string[]
  reviewChecklistDisclaimer: string
  // OGQ 마켓 연동 — 출시 검토(Review) 페이지의 이미지 직접 업로드 스펙 검사
  reviewUploadTitle: string
  reviewUploadDesc: string
  reviewUploadDrop: string
  reviewUploadHint: string
  reviewUploadSelectFile: string
  reviewUploadRemove: string
  reviewUploadDisclaimer: string
  reviewProjectCheckTitle: string
  reviewProjectCheckDesc: string
  reviewProjectCheckLoading: string
  reviewProjectCheckFailed: string
  reviewCheckFormatLabel: string
  reviewCheckSizeLabel: string
  reviewCheckDimensionsLabel: string
  reviewCheckTransparencyLabel: string
  reviewCheckMarginLabel: string
  reviewCheckFormatPass: string
  reviewCheckFormatFail: string // {type}
  reviewCheckSizePass: string // {size}
  reviewCheckSizeFail: string // {size}
  reviewCheckDimensionsPass: string // {w}, {h}, {category}
  reviewCheckDimensionsFail: string // {w}, {h}
  reviewCheckTransparencyPass: string
  reviewCheckTransparencyFail: string
  reviewCheckMarginPass: string
  reviewCheckMarginWarn: string
  reviewCheckMarginUnknown: string
  reviewCategoryMain: string
  reviewCategorySticker: string
  reviewCategoryTab: string
  reviewCheckAllPass: string
  reviewCheckIssues: string // {n}
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
  loginTitle: string
  loginSubtitle: string
  loginTabLogin: string
  loginTabSignup: string
  loginEmailLabel: string
  loginEmailPlaceholder: string
  loginPasswordLabel: string
  loginPasswordPlaceholder: string
  loginNameLabel: string
  loginNamePlaceholder: string
  loginNameOptional: string
  loginSubmitLogin: string
  loginSubmitSignup: string
  loginDivider: string
  loginNaverCta: string
  loginGoogleCta: string
  loginGooglePreparing: string
  loginGoogleProcessing: string
  loginGoogleNotConfigured: string
  loginSwitchToSignup: string
  loginSwitchToLogin: string
  loginBackHome: string
  loginNaverProcessing: string
  loginNaverFailed: string
  loginNaverBack: string
  loginGoogleFailed: string
  loginSuccessToast: string
}

export const translations: Record<SiteLang, Dict> = {
  ko: {
    cloudLogin: '작업을 클라우드에 저장하려면 로그인해주세요.',
    cloudSaving: '클라우드에 저장 중…',
    cloudSaved: '계정에 저장됨',
    cloudSaveFailed: '클라우드 저장에 실패했어요. 다시 시도해주세요.',
    cloudRetry: '다시 시도',
    cloudInProgress: '진행 중인 작업',
    cloudArchive: '작업 아카이브',
    cloudEmptyProgress: '진행 중인 작업이 없어요. 현지화나 이모티콘 생성을 시작해보세요.',
    cloudEmptyArchive: '완료한 작업이 아직 없어요.',
    cloudLoading: '작업을 불러오는 중…',
    cloudListFailed: '작업 목록을 불러오지 못했어요.',
    cloudOpen: '작업 열기',
    cloudRecent: '최근 저장',
    cloudNewConfirm: '현재 작업을 닫고 새 작업을 시작할까요? 클라우드에 저장된 작업은 유지돼요.',
    cloudNewTitle: '새 작업을 시작할까요?',
    cloudNewProceed: '새 작업 시작',
    cloudDelete: '삭제',
    cloudDeleteTitle: '작업을 삭제할까요?',
    cloudDeleteDescription: '“{name}” 작업과 저장된 이미지·편집 내용이 모두 사라져요. 삭제하면 되돌릴 수 없어요.',
    cloudDeleteConfirm: '영구 삭제',
    cloudDeleteCancel: '취소',
    cloudDeleteSuccess: '작업을 삭제했어요.',
    cloudDeleteFailed: '작업을 삭제하지 못했어요. 다시 시도해주세요.',
    commonClose: '닫기',

    hubDashboard: '대시보드',
    hubTitle: '어떤 작업을 시작할까요?',
    hubSubtitle: '이모티콘의 제작부터 현지화와 출시 준비까지, Glocalizer와 함께해요.',
    hubLocalize: '이모티콘 현지화',
    hubLocalizeDesc: '이모티콘 속 문구를 다른 언어의 자연스러운 표현으로 바꿔요.',
    hubReview: 'OGQ 출시 검토',
    hubReviewDesc: '출시 준비를 위한 이모티콘 검토를 도와드려요.',
    hubGenerate: '이모티콘 생성',
    hubGenerateDesc: '아이디어를 새로운 이모티콘으로 만들어요.',
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
    accountTitle: '설정',
    accountDesc: 'Glocalizer 계정 정보를 확인하고 관리하세요.',
    accountName: '닉네임',
    accountEmail: '이메일',
    accountSignupMethod: '연결된 로그인 수단',
    accountEmailLogin: '이메일 로그인',
    accountNaverLogin: '네이버 로그인',
    accountGoogleLogin: 'Google 로그인',
    accountChecking: '확인 중',
    accountMissing: '등록된 정보 없음',
    accountMenu: '프로필 메뉴',
    accountEdit: '프로필 수정',
    accountSave: '저장',
    accountCancel: '취소',
    accountChangePhoto: '사진 변경',
    accountRemovePhoto: '기본 이미지로',
    accountNameRequired: '닉네임을 입력해주세요.',
    accountSaved: '프로필을 저장했어요.',
    accountSaveFailed: '프로필 저장에 실패했어요.',
    accountPhotoInvalid: '이미지 파일만 올릴 수 있어요. (최대 10MB)',
    accountDangerZoneTitle: '위험 구역',
    accountDangerZoneDesc: '계정을 탈퇴하면 저장된 모든 프로젝트와 이미지, 프로필 정보가 영구적으로 삭제되고 되돌릴 수 없어요.',
    accountDeleteButton: '계정 탈퇴',
    accountDeleteConfirm: '정말로 계정을 탈퇴하시겠어요? 저장된 모든 프로젝트와 이미지가 함께 삭제되며, 이 작업은 되돌릴 수 없어요.',
    accountDeleteFailed: '계정 탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.',
    accountDeleteSuccess: '탈퇴 완료했어요',
    accountDeleteProcessingTitle: '계정을 탈퇴하고 있어요',
    accountDeleteProcessingDesc: '저장된 프로젝트와 이미지를 정리하고 있어요. 잠시만 기다려주세요.',
    accountSecurityTitle: '보안',
    accountSecurityDesc: '이메일로 가입한 계정의 비밀번호를 변경할 수 있어요.',
    accountPasswordChangeCta: '비밀번호 변경',
    accountPasswordCurrentLabel: '현재 비밀번호',
    accountPasswordNewLabel: '새 비밀번호',
    accountPasswordConfirmLabel: '새 비밀번호 확인',
    accountPasswordSubmit: '변경하기',
    accountPasswordCurrentRequired: '현재 비밀번호를 입력해주세요.',
    accountPasswordTooShort: '새 비밀번호는 8자 이상이어야 해요.',
    accountPasswordMismatch: '새 비밀번호가 일치하지 않아요.',
    accountPasswordSuccess: '비밀번호를 변경했어요.',
    accountPasswordFailed: '비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요.',
    accountDeleteModalTitle: '계정 탈퇴',
    accountDeleteAckData: '저장된 모든 프로젝트와 이미지, 프로필 정보가 영구적으로 삭제되며 복구할 수 없음을 확인했습니다.',
    accountDeleteAckResignup: '탈퇴 후 같은 이메일/계정으로 다시 가입할 수는 있지만, 이전 데이터는 복구되지 않음을 확인했습니다.',
    accountDeleteConfirmCta: '탈퇴하기',
    accountPolicyTitle: '정책 및 약관',
    accountPolicyDesc: '개인정보 처리와 서비스 이용 조건을 확인하세요.',
    privacyPolicy: '개인정보처리방침',
    termsOfService: '서비스 이용약관',

    feedbackMenuLabel: '피드백',
    feedbackModalTitle: '피드백 보내기',
    feedbackModalDesc: '불편한 점이나 개선 아이디어를 알려주세요. 저희 GitHub 저장소에 이슈로 등록돼요.',
    feedbackPlaceholder: '자유롭게 의견을 남겨주세요 (10자 이상)',
    feedbackSubmit: '보내기',
    feedbackSending: '보내는 중…',
    feedbackSuccess: '피드백을 보냈어요. 감사합니다!',
    feedbackTooShort: '피드백은 10자 이상 입력해주세요.',
    feedbackFailed: '피드백 전송에 실패했어요. 잠시 후 다시 시도해주세요.',
    feedbackCategoryBug: '버그',
    feedbackCategoryFeature: '기능 제안',
    feedbackCategoryOther: '기타',

    navStart: '시작하기',
    navService: '서비스 소개',
    heroBrandTag: 'Glocalizer',
    heroLine1: '이모티콘을',
    heroLine2: '현지화하고 검토하고 생성해요',
    heroLine2Roll: ['현지화해요', '검토해요', '생성해요'],
    heroDesc: '현지화, 검토, 생성까지\n이모티콘 작업을 한 곳에서 끝내요.',
    heroCta: '시작하기',
    heroReplay: '영상 처음부터 다시 보기',
    beforeAfter: 'Before → After',
    cardTitle: '한글 밈이 현지 표현이 돼요',
    beforeLabel: 'Before · 원본',
    afterLabel: 'After · 변환',
    ogqGalleryTitle: 'OGQ 마켓의 인기 스티커들',
    ogqGalleryDesc: '이런 이모티콘 속 한글도 Glocalizer로 손쉽게 현지화할 수 있어요.',
    ogqGalleryCredit: 'OGQ 마켓 제공 무료 스티커',
    sampleTryLabel: 'OGQ 스티커',
    samplePickerTitle: '샘플 이모티콘 선택',
    samplePickerDesc: 'OGQ 마켓의 무료 스티커로 먼저 체험해보세요.',
    samplePickerLoading: '샘플을 불러오는 중...',
    samplePickerError: '샘플을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    samplePickerEmpty: '지금은 사용할 수 있는 샘플이 없어요.',
    reviewPickProjectTitle: '검토할 프로젝트를 복수 선택하세요',
    reviewPickProjectDesc: '완료된 현지화 프로젝트와 생성 프로젝트를 함께 선택해 OGQ 기준으로 검수해요.',
    reviewProjectsLoading: '검토 가능한 프로젝트를 불러오는 중...',
    reviewProjectsEmpty: '아직 검토할 수 있는 완료된 프로젝트가 없어요.',
    reviewProjectsEmptyCta: '이모티콘 현지화하러 가기',
    reviewProjectsFailed: '프로젝트 목록을 불러오지 못했어요.',
    reviewLoadingWorkspace: '프로젝트 문구를 분석하는 중...',
    reviewWorkspaceFailed: '프로젝트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    reviewSimilarTitle: '비슷한 문구의 기존 스티커',
    reviewSimilarDesc: '완성 이미지에서 인식한 문구로 OGQ 마켓을 검색해요. 출시 전 표현의 차별점을 참고해보세요.',
    reviewNoKeywords: '프로젝트에서 검색에 쓸 문구를 찾지 못했어요.',
    reviewKeywordEmpty: '같거나 비슷한 문구의 스티커를 찾지 못했어요.',
    reviewKeywordFailed: '검색에 실패했어요.',
    reviewAnimatedBadge: '움직임',
    reviewAiTitle: 'AI 심층 피드백',
    reviewAiDesc: '선택한 완성 이미지와 OCR·번역 결과를 함께 분석해 출시 전에 개선할 부분을 우선순위로 정리해요.',
    reviewAiCta: '심층 피드백 받기',
    reviewAiLoading: '분석 중...',
    reviewAiFailed: '심층 피드백을 만들지 못했어요. 잠시 후 다시 시도해주세요.',
    reviewAiLimit: 'AI 심층 피드백은 한 번에 프로젝트 3개까지 분석할 수 있어요.',
    reviewAiScore: 'AI 출시 준비도',
    reviewAiStrengths: '잘된 점',
    reviewAiFixes: '우선 수정할 점',
    reviewAiImages: '이미지별 피드백',
    reviewAiLocalization: '현지화 피드백',
    reviewChecklistTitle: 'OGQ 마켓 출시 체크리스트',
    reviewChecklistItems: [
      '이미지는 투명 배경 PNG로 준비하세요 (기준 캔버스 740×640px, 파일당 1MB 이하)',
      '세트 안 이미지들이 동일한 캐릭터·화풍·색감을 유지하는지 확인하세요',
      '검색 노출을 위해 제목과 태그에 실제 감정·상황을 나타내는 키워드를 포함하세요',
      '저작권이 있는 캐릭터·폰트·이미지를 무단으로 사용하지 않았는지 확인하세요',
      '선정적이거나 폭력적인 표현이 없는지 확인하세요',
    ],
    reviewChecklistDisclaimer: '정확한 최신 출시 규정은 OGQ 크리에이터 스튜디오의 공식 안내를 확인해주세요. 이 체크리스트는 참고용입니다.',
    reviewUploadTitle: '또는, 이미지 바로 업로드하기',
    reviewUploadDesc: '프로젝트 없이도 완성된 스티커 이미지만으로 OGQ 스펙을 바로 확인해요.',
    reviewUploadDrop: '이미지를 선택하거나 끌어다 놓으세요',
    reviewUploadHint: 'OGQ 공식 기준 · 메인 240×240 · 스티커 740×640 · 탭 96×74 · 각 1MB 이하 · PNG · 투명 배경',
    reviewUploadSelectFile: '이미지 선택',
    reviewUploadRemove: '삭제',
    reviewUploadDisclaimer: '이 검사는 자동으로 규격만 확인하는 참고용이에요. 실제 OGQ 심사 결과와 다를 수 있어요.',
    reviewProjectCheckTitle: '선택한 프로젝트 OGQ 규격 검사',
    reviewProjectCheckDesc: '선택한 프로젝트의 이미지 {n}개를 자동으로 검사해요.',
    reviewProjectCheckLoading: '프로젝트 이미지를 검사하는 중...',
    reviewProjectCheckFailed: '프로젝트 이미지를 불러오지 못했어요. 선택을 해제한 뒤 다시 시도해주세요.',
    reviewCheckFormatLabel: '파일 형식',
    reviewCheckSizeLabel: '용량',
    reviewCheckDimensionsLabel: '크기 규격',
    reviewCheckTransparencyLabel: '투명 배경',
    reviewCheckMarginLabel: '여백',
    reviewCheckFormatPass: 'PNG 형식이에요.',
    reviewCheckFormatFail: '{type} 형식이에요. 투명 배경을 지원하는 PNG로 저장해주세요.',
    reviewCheckSizePass: '{size} — 1MB 이하예요.',
    reviewCheckSizeFail: '{size} — 1MB를 넘었어요. 용량을 줄여주세요.',
    reviewCheckDimensionsPass: '{w}×{h}px — {category} 규격에 맞아요.',
    reviewCheckDimensionsFail: '{w}×{h}px — 메인 240×240, 스티커 740×640, 탭 96×74 중 어디에도 맞지 않아요.',
    reviewCheckTransparencyPass: '투명 배경이 확인됐어요.',
    reviewCheckTransparencyFail: '배경이 투명하지 않아요. 알파 채널이 있는 PNG로 내보내주세요.',
    reviewCheckMarginPass: '캐릭터 주변 여백이 충분해요.',
    reviewCheckMarginWarn: '캐릭터가 가장자리에 너무 붙어있어요. 여백을 좀 더 주세요.',
    reviewCheckMarginUnknown: '투명 배경이 없어서 여백을 측정할 수 없어요.',
    reviewCategoryMain: '메인 이미지',
    reviewCategorySticker: '스티커 이미지',
    reviewCategoryTab: '탭 이미지',
    reviewCheckAllPass: '모든 항목을 통과했어요!',
    reviewCheckIssues: '{n}개 항목을 확인해주세요.',
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
    nfTitle: '페이지를 찾을 수 없어요😭',
    nfDesc: '주소가 바뀌었거나 없는 페이지예요.',
    nfHome: '홈으로 돌아가기',
    navLogin: '로그인',
    navLogout: '로그아웃',
    loginTitle: '환영해요',
    loginSubtitle: '로그인하고 이모티콘 번역 기록을 이어가세요.',
    loginTabLogin: '로그인',
    loginTabSignup: '회원가입',
    loginEmailLabel: '이메일',
    loginEmailPlaceholder: 'you@example.com',
    loginPasswordLabel: '비밀번호',
    loginPasswordPlaceholder: '8자 이상 입력해주세요',
    loginNameLabel: '이름',
    loginNamePlaceholder: '닉네임',
    loginNameOptional: '(선택)',
    loginSubmitLogin: '로그인',
    loginSubmitSignup: '회원가입',
    loginDivider: '또는',
    loginNaverCta: '네이버 아이디로 로그인',
    loginGoogleCta: 'Google로 계속하기',
    loginGooglePreparing: 'Google 로그인 준비 중…',
    loginGoogleProcessing: 'Google 로그인 처리 중…',
    loginGoogleNotConfigured: 'Google 로그인이 아직 설정되지 않았어요.',
    loginSwitchToSignup: '계정이 없으신가요? 회원가입',
    loginSwitchToLogin: '이미 계정이 있으신가요? 로그인',
    loginBackHome: '홈으로',
    loginNaverProcessing: '네이버 로그인 처리 중이에요…',
    loginNaverFailed: '네이버 로그인에 실패했어요.',
    loginNaverBack: '로그인 화면으로 돌아가기',
    loginGoogleFailed: 'Google 로그인에 실패했어요.',
    loginSuccessToast: '로그인 완료!',
  },
  en: {
    cloudLogin: 'Please log in to save your work to the cloud.',
    cloudSaving: 'Saving to cloud…',
    cloudSaved: 'Saved to your account',
    cloudSaveFailed: 'Cloud saving failed. Please try again.',
    cloudRetry: 'Try again',
    cloudInProgress: 'Work in progress',
    cloudArchive: 'Work archive',
    cloudEmptyProgress: 'No work in progress. Start localizing or generating emoticons.',
    cloudEmptyArchive: 'No finished work yet.',
    cloudLoading: 'Loading your work…',
    cloudListFailed: 'Could not load your work.',
    cloudOpen: 'Open work',
    cloudRecent: 'Last saved',
    cloudNewConfirm: 'Close this work and start a new task? Work saved to the cloud will remain.',
    cloudNewTitle: 'Start a new task?',
    cloudNewProceed: 'Start new task',
    cloudDelete: 'Delete',
    cloudDeleteTitle: 'Delete this work?',
    cloudDeleteDescription: '“{name}” and all saved images and edits will be permanently deleted. This cannot be undone.',
    cloudDeleteConfirm: 'Delete permanently',
    cloudDeleteCancel: 'Cancel',
    cloudDeleteSuccess: 'Work deleted.',
    cloudDeleteFailed: 'Could not delete this work. Please try again.',
    commonClose: 'Close',

    hubDashboard: 'Dashboard',
    hubTitle: 'What would you like to work on?',
    hubSubtitle: 'Create, localize, and prepare your emoticons for release with Glocalizer.',
    hubLocalize: 'Emoticon localization',
    hubLocalizeDesc: 'Turn captions into natural expressions in other languages.',
    hubReview: 'OGQ release review',
    hubReviewDesc: 'Get help reviewing your emoticons before release.',
    hubGenerate: 'Emoticon generation',
    hubGenerateDesc: 'Turn your ideas into new emoticons.',
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
    accountTitle: 'Settings',
    accountDesc: 'View and manage your Glocalizer account.',
    accountName: 'Nickname',
    accountEmail: 'Email',
    accountSignupMethod: 'Linked login methods',
    accountEmailLogin: 'Email login',
    accountNaverLogin: 'Naver login',
    accountGoogleLogin: 'Google login',
    accountChecking: 'Checking',
    accountMissing: 'No information provided',
    accountMenu: 'Profile menu',
    accountEdit: 'Edit profile',
    accountSave: 'Save',
    accountCancel: 'Cancel',
    accountChangePhoto: 'Change photo',
    accountRemovePhoto: 'Use default',
    accountNameRequired: 'Please enter a nickname.',
    accountSaved: 'Profile saved.',
    accountSaveFailed: 'Could not save your profile.',
    accountPhotoInvalid: 'Only image files up to 10MB are supported.',
    accountDangerZoneTitle: 'Danger zone',
    accountDangerZoneDesc: 'Deleting your account permanently removes all saved projects, images, and profile information. This cannot be undone.',
    accountDeleteButton: 'Delete account',
    accountDeleteConfirm: 'Are you sure you want to delete your account? All saved projects and images will be deleted too, and this cannot be undone.',
    accountDeleteFailed: "Couldn't delete your account. Please try again in a moment.",
    accountDeleteSuccess: 'Account deleted',
    accountDeleteProcessingTitle: 'Deleting your account',
    accountDeleteProcessingDesc: 'Removing your saved projects and images. This will just take a moment.',
    accountSecurityTitle: 'Security',
    accountSecurityDesc: 'Change the password for accounts signed up with email.',
    accountPasswordChangeCta: 'Change password',
    accountPasswordCurrentLabel: 'Current password',
    accountPasswordNewLabel: 'New password',
    accountPasswordConfirmLabel: 'Confirm new password',
    accountPasswordSubmit: 'Update password',
    accountPasswordCurrentRequired: 'Please enter your current password.',
    accountPasswordTooShort: 'New password must be at least 8 characters.',
    accountPasswordMismatch: "New passwords don't match.",
    accountPasswordSuccess: 'Password updated.',
    accountPasswordFailed: "Couldn't update your password. Please try again in a moment.",
    accountDeleteModalTitle: 'Delete account',
    accountDeleteAckData: 'I understand all saved projects, images, and profile information will be permanently deleted and cannot be recovered.',
    accountDeleteAckResignup: 'I understand I can sign up again with the same email/account, but my previous data will not be restored.',
    accountDeleteConfirmCta: 'Delete my account',
    accountPolicyTitle: 'Policies and terms',
    accountPolicyDesc: 'Review how your information is handled and the service terms.',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',

    feedbackMenuLabel: 'Feedback',
    feedbackModalTitle: 'Send feedback',
    feedbackModalDesc: "Tell us what's bothering you or what could be better. This is posted as an issue on our GitHub repo.",
    feedbackPlaceholder: 'Share your thoughts freely (at least 10 characters)',
    feedbackSubmit: 'Send',
    feedbackSending: 'Sending…',
    feedbackSuccess: 'Thanks for the feedback!',
    feedbackTooShort: 'Feedback must be at least 10 characters.',
    feedbackFailed: 'Failed to send feedback. Please try again shortly.',
    feedbackCategoryBug: 'Bug',
    feedbackCategoryFeature: 'Feature request',
    feedbackCategoryOther: 'Other',

    navStart: 'Start',
    navService: 'About',
    heroBrandTag: 'Glocalizer',
    heroLine1: 'Your emoji,',
    heroLine2: 'localized, reviewed, and generated',
    heroLine2Roll: ['localized', 'reviewed', 'generated'],
    heroDesc: 'Localize, review, and generate your emoji — all in one place.',
    heroCta: 'Get started',
    heroReplay: 'Replay the video from the start',
    beforeAfter: 'Before → After',
    cardTitle: 'Korean memes become local expressions',
    beforeLabel: 'Before · Original',
    afterLabel: 'After · Localized',
    ogqGalleryTitle: 'Popular stickers from OGQ Market',
    ogqGalleryDesc: 'Emoticons like these can be localized in seconds with Glocalizer.',
    ogqGalleryCredit: 'Free stickers provided by OGQ Market',
    sampleTryLabel: 'OGQ Stickers',
    samplePickerTitle: 'Choose a sample emoticon',
    samplePickerDesc: 'Try it out first with a free sticker from OGQ Market.',
    samplePickerLoading: 'Loading samples...',
    samplePickerError: "Couldn't load samples. Please try again.",
    samplePickerEmpty: 'No samples are available right now.',
    reviewPickProjectTitle: 'Choose multiple projects to review',
    reviewPickProjectDesc: 'Select finished localization and generation projects together for an OGQ spec review.',
    reviewProjectsLoading: 'Loading projects available for review...',
    reviewProjectsEmpty: "You don't have any finished projects to review yet.",
    reviewProjectsEmptyCta: 'Go localize an emoticon',
    reviewProjectsFailed: "Couldn't load your projects.",
    reviewLoadingWorkspace: 'Analyzing project captions...',
    reviewWorkspaceFailed: "Couldn't load the project. Please try again.",
    reviewSimilarTitle: 'Existing stickers with similar captions',
    reviewSimilarDesc: 'We search OGQ Market using captions recognized in your finished images, so you can compare wording before launch.',
    reviewNoKeywords: "We couldn't find any captions to search with in this project.",
    reviewKeywordEmpty: 'No stickers with the same or similar captions were found.',
    reviewKeywordFailed: 'Search failed.',
    reviewAnimatedBadge: 'Animated',
    reviewAiTitle: 'AI deep feedback',
    reviewAiDesc: 'Analyze the selected finished images together with OCR and translations to prioritize improvements before release.',
    reviewAiCta: 'Get deep feedback',
    reviewAiLoading: 'Analyzing...',
    reviewAiFailed: "Couldn't generate deep feedback. Please try again.",
    reviewAiLimit: 'AI deep feedback can analyze up to 3 projects at a time.',
    reviewAiScore: 'AI release readiness',
    reviewAiStrengths: 'What works well',
    reviewAiFixes: 'Priority improvements',
    reviewAiImages: 'Feedback by image',
    reviewAiLocalization: 'Localization feedback',
    reviewChecklistTitle: 'OGQ Market launch checklist',
    reviewChecklistItems: [
      'Prepare transparent-background PNGs (reference canvas 740×640px, under 1MB per file)',
      'Keep the same character, art style, and color palette consistent across the set',
      'Include keywords that reflect the actual emotion or situation in your title and tags for discoverability',
      "Make sure you're not using copyrighted characters, fonts, or images without permission",
      'Check that there is no sexual or violent content',
    ],
    reviewChecklistDisclaimer: 'For the current official submission requirements, please check OGQ Creator Studio directly — this checklist is for reference only.',
    reviewUploadTitle: 'Or upload images directly',
    reviewUploadDesc: 'Check OGQ specs right away with a finished sticker image — no project required.',
    reviewUploadDrop: 'Choose an image or drop it here',
    reviewUploadHint: 'OGQ official specs · Main 240×240 · Sticker 740×640 · Tab 96×74 · 1MB or less each · PNG · transparent background',
    reviewUploadSelectFile: 'Choose image',
    reviewUploadRemove: 'Remove',
    reviewUploadDisclaimer: 'This check only verifies specs automatically, for reference — actual OGQ review results may differ.',
    reviewProjectCheckTitle: 'Selected project OGQ spec check',
    reviewProjectCheckDesc: 'Automatically checking {n} images from the selected projects.',
    reviewProjectCheckLoading: 'Checking project images...',
    reviewProjectCheckFailed: "Couldn't load the project images. Deselect the project and try again.",
    reviewCheckFormatLabel: 'File format',
    reviewCheckSizeLabel: 'File size',
    reviewCheckDimensionsLabel: 'Dimensions',
    reviewCheckTransparencyLabel: 'Transparent background',
    reviewCheckMarginLabel: 'Margin',
    reviewCheckFormatPass: "It's a PNG file.",
    reviewCheckFormatFail: "It's a {type} file. Save it as a PNG to support a transparent background.",
    reviewCheckSizePass: '{size} — under 1MB.',
    reviewCheckSizeFail: '{size} — over 1MB. Please reduce the file size.',
    reviewCheckDimensionsPass: '{w}×{h}px — matches the {category} spec.',
    reviewCheckDimensionsFail: "{w}×{h}px — doesn't match Main (240×240), Sticker (740×640), or Tab (96×74).",
    reviewCheckTransparencyPass: 'Transparent background confirmed.',
    reviewCheckTransparencyFail: 'The background is not transparent. Export a PNG with an alpha channel.',
    reviewCheckMarginPass: 'There is enough margin around the character.',
    reviewCheckMarginWarn: 'The character is too close to the edge. Add more margin.',
    reviewCheckMarginUnknown: "Margin can't be measured without a transparent background.",
    reviewCategoryMain: 'Main image',
    reviewCategorySticker: 'Sticker image',
    reviewCategoryTab: 'Tab image',
    reviewCheckAllPass: 'Every check passed!',
    reviewCheckIssues: '{n} item(s) need a look.',
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
    nfTitle: 'Page not found😭',
    nfDesc: 'The page may have moved or no longer exists.',
    nfHome: 'Back to home',
    navLogin: 'Log in',
    navLogout: 'Log out',
    loginTitle: 'Welcome back',
    loginSubtitle: 'Log in to keep your emoji translation history.',
    loginTabLogin: 'Log in',
    loginTabSignup: 'Sign up',
    loginEmailLabel: 'Email',
    loginEmailPlaceholder: 'you@example.com',
    loginPasswordLabel: 'Password',
    loginPasswordPlaceholder: 'At least 8 characters',
    loginNameLabel: 'Name',
    loginNamePlaceholder: 'Nickname',
    loginNameOptional: '(optional)',
    loginSubmitLogin: 'Log in',
    loginSubmitSignup: 'Sign up',
    loginDivider: 'or',
    loginNaverCta: 'Continue with Naver',
    loginGoogleCta: 'Continue with Google',
    loginGooglePreparing: 'Preparing Google login…',
    loginGoogleProcessing: 'Signing you in with Google…',
    loginGoogleNotConfigured: 'Google login is not configured yet.',
    loginSwitchToSignup: "Don't have an account? Sign up",
    loginSwitchToLogin: 'Already have an account? Log in',
    loginBackHome: 'Home',
    loginNaverProcessing: 'Signing you in with Naver…',
    loginNaverFailed: 'Naver login failed.',
    loginNaverBack: 'Back to login',
    loginGoogleFailed: 'Google login failed.',
    loginSuccessToast: 'Logged in!',
  },
  ja: {
    cloudLogin: 'クラウドに保存するにはログインしてください。',
    cloudSaving: 'クラウドに保存中…',
    cloudSaved: 'アカウントに保存済み',
    cloudSaveFailed: 'クラウドへの保存に失敗しました。再試行してください。',
    cloudRetry: '再試行',
    cloudInProgress: '進行中の作業',
    cloudArchive: '作業アーカイブ',
    cloudEmptyProgress: '進行中の作業はありません。現地化かスタンプ生成を始めましょう。',
    cloudEmptyArchive: '完了した作業はまだありません。',
    cloudLoading: '作業を読み込み中…',
    cloudListFailed: '作業を読み込めませんでした。',
    cloudOpen: '作業を開く',
    cloudRecent: '最終保存',
    cloudNewConfirm: 'この作業を閉じて新しく始めますか？クラウドに保存した作業は残ります。',
    cloudNewTitle: '新しい作業を始めますか？',
    cloudNewProceed: '新しい作業を開始',
    cloudDelete: '削除',
    cloudDeleteTitle: 'この作業を削除しますか？',
    cloudDeleteDescription: '「{name}」と保存された画像・編集内容がすべて削除されます。元に戻すことはできません。',
    cloudDeleteConfirm: '完全に削除',
    cloudDeleteCancel: 'キャンセル',
    cloudDeleteSuccess: '作業を削除しました。',
    cloudDeleteFailed: '作業を削除できませんでした。再試行してください。',
    commonClose: '閉じる',

    hubDashboard: 'ダッシュボード',
    hubTitle: 'どんな作業を始めますか？',
    hubSubtitle: '制作から翻訳、リリース準備まで、Glocalizerと一緒に。',
    hubLocalize: 'スタンプの現地化',
    hubLocalizeDesc: 'スタンプの文字を他の言語の自然な表現に変えます。',
    hubReview: 'OGQリリース確認',
    hubReviewDesc: 'リリース前のスタンプ確認をサポートします。',
    hubGenerate: 'スタンプ生成',
    hubGenerateDesc: 'アイデアを新しいスタンプにします。',
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
    accountTitle: '設定',
    accountDesc: 'Glocalizerアカウント情報を確認・管理できます。',
    accountName: 'ニックネーム',
    accountEmail: 'メール',
    accountSignupMethod: '連携中のログイン方法',
    accountEmailLogin: 'メールログイン',
    accountNaverLogin: 'NAVERログイン',
    accountGoogleLogin: 'Googleログイン',
    accountChecking: '確認中',
    accountMissing: '登録情報なし',
    accountMenu: 'プロフィールメニュー',
    accountEdit: 'プロフィールを編集',
    accountSave: '保存',
    accountCancel: 'キャンセル',
    accountChangePhoto: '写真を変更',
    accountRemovePhoto: 'デフォルトに戻す',
    accountNameRequired: 'ニックネームを入力してください。',
    accountSaved: 'プロフィールを保存しました。',
    accountSaveFailed: 'プロフィールを保存できませんでした。',
    accountPhotoInvalid: '10MBまでの画像ファイルのみアップロードできます。',
    accountDangerZoneTitle: '危険ゾーン',
    accountDangerZoneDesc: 'アカウントを削除すると、保存済みのプロジェクト・画像・プロフィール情報がすべて完全に削除され、元に戻せません。',
    accountDeleteButton: 'アカウント削除',
    accountDeleteConfirm: '本当にアカウントを削除しますか？保存済みのプロジェクトと画像もすべて削除され、元に戻せません。',
    accountDeleteFailed: 'アカウントを削除できませんでした。しばらくしてから再試行してください。',
    accountDeleteSuccess: '退会が完了しました',
    accountDeleteProcessingTitle: 'アカウントを削除しています',
    accountDeleteProcessingDesc: '保存されたプロジェクトと画像を整理しています。少々お待ちください。',
    accountSecurityTitle: 'セキュリティ',
    accountSecurityDesc: 'メールで登録したアカウントのパスワードを変更できます。',
    accountPasswordChangeCta: 'パスワード変更',
    accountPasswordCurrentLabel: '現在のパスワード',
    accountPasswordNewLabel: '新しいパスワード',
    accountPasswordConfirmLabel: '新しいパスワード（確認）',
    accountPasswordSubmit: '変更する',
    accountPasswordCurrentRequired: '現在のパスワードを入力してください。',
    accountPasswordTooShort: '新しいパスワードは8文字以上にしてください。',
    accountPasswordMismatch: '新しいパスワードが一致しません。',
    accountPasswordSuccess: 'パスワードを変更しました。',
    accountPasswordFailed: 'パスワードを変更できませんでした。しばらくしてから再試行してください。',
    accountDeleteModalTitle: 'アカウント削除',
    accountDeleteAckData: '保存済みのすべてのプロジェクト・画像・プロフィール情報が完全に削除され、復元できないことを理解しました。',
    accountDeleteAckResignup: '削除後は同じメール/アカウントで再登録できますが、以前のデータは復元されないことを理解しました。',
    accountDeleteConfirmCta: '削除する',
    accountPolicyTitle: 'ポリシーと利用規約',
    accountPolicyDesc: '個人情報の取り扱いとサービス利用条件を確認できます。',
    privacyPolicy: 'プライバシーポリシー',
    termsOfService: '利用規約',

    feedbackMenuLabel: 'フィードバック',
    feedbackModalTitle: 'フィードバックを送る',
    feedbackModalDesc: '不便な点や改善アイデアを教えてください。GitHubリポジトリのIssueとして登録されます。',
    feedbackPlaceholder: 'ご自由にご意見をお書きください（10文字以上）',
    feedbackSubmit: '送信',
    feedbackSending: '送信中…',
    feedbackSuccess: 'フィードバックを送信しました。ありがとうございます！',
    feedbackTooShort: 'フィードバックは10文字以上入力してください。',
    feedbackFailed: 'フィードバックの送信に失敗しました。しばらくしてから再度お試しください。',
    feedbackCategoryBug: 'バグ',
    feedbackCategoryFeature: '機能提案',
    feedbackCategoryOther: 'その他',

    navStart: 'はじめる',
    navService: 'サービス紹介',
    heroBrandTag: 'Glocalizer',
    heroLine1: 'スタンプを',
    heroLine2: '現地化して、確認して、生成します',
    heroLine2Roll: ['現地化します', '確認します', '生成します'],
    heroDesc: '現地化・確認・生成まで、スタンプ制作をこれひとつで完結。',
    heroCta: 'はじめる',
    heroReplay: '動画を最初から再生',
    beforeAfter: 'Before → After',
    cardTitle: '韓国のミームがローカル表現になります',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 変換',
    ogqGalleryTitle: 'OGQマーケットの人気スティッカー',
    ogqGalleryDesc: 'こんな絵文字の韓国語も、Glocalizerで簡単にローカライズできます。',
    ogqGalleryCredit: 'OGQマーケット提供の無料スティッカー',
    sampleTryLabel: 'OGQステッカー',
    samplePickerTitle: 'サンプル絵文字を選択',
    samplePickerDesc: 'OGQマーケットの無料スティッカーでまず体験してみましょう。',
    samplePickerLoading: 'サンプルを読み込み中...',
    samplePickerError: 'サンプルを読み込めませんでした。しばらくしてから再試行してください。',
    samplePickerEmpty: '現在利用できるサンプルがありません。',
    reviewPickProjectTitle: 'レビューするプロジェクトを複数選択',
    reviewPickProjectDesc: '完了したローカライズと生成プロジェクトをまとめてOGQ基準で確認します。',
    reviewProjectsLoading: 'レビュー可能なプロジェクトを読み込み中...',
    reviewProjectsEmpty: 'まだレビューできる完了プロジェクトがありません。',
    reviewProjectsEmptyCta: '絵文字をローカライズしに行く',
    reviewProjectsFailed: 'プロジェクト一覧を読み込めませんでした。',
    reviewLoadingWorkspace: 'プロジェクトの文言を分析中...',
    reviewWorkspaceFailed: 'プロジェクトを読み込めませんでした。しばらくしてから再試行してください。',
    reviewSimilarTitle: '似た文言の既存スティッカー',
    reviewSimilarDesc: '完成画像から認識した文言でOGQマーケットを検索し、リリース前に表現の違いを比較できます。',
    reviewNoKeywords: 'プロジェクトから検索に使える文言が見つかりませんでした。',
    reviewKeywordEmpty: '同じ、または似た文言のスティッカーが見つかりませんでした。',
    reviewKeywordFailed: '検索に失敗しました。',
    reviewAnimatedBadge: 'アニメーション',
    reviewAiTitle: 'AI詳細フィードバック',
    reviewAiDesc: '選択した完成画像とOCR・翻訳結果をまとめて分析し、リリース前の改善点を優先順に整理します。',
    reviewAiCta: '詳細フィードバックを受ける',
    reviewAiLoading: '分析中...',
    reviewAiFailed: '詳細フィードバックを作成できませんでした。しばらくしてから再試行してください。',
    reviewAiLimit: 'AI詳細フィードバックは一度に3件まで分析できます。',
    reviewAiScore: 'AIリリース準備度',
    reviewAiStrengths: '良い点',
    reviewAiFixes: '優先して修正する点',
    reviewAiImages: '画像別フィードバック',
    reviewAiLocalization: 'ローカライズフィードバック',
    reviewChecklistTitle: 'OGQマーケットリリースチェックリスト',
    reviewChecklistItems: [
      '透明背景のPNGで準備してください(基準キャンバス740×640px、ファイルごと1MB以下)',
      'セット内の画像が同じキャラクター・画風・色味を保っているか確認してください',
      '検索露出のためタイトルとタグに実際の感情・状況を表すキーワードを含めてください',
      '著作権のあるキャラクター・フォント・画像を無断使用していないか確認してください',
      '性的または暴力的な表現がないか確認してください',
    ],
    reviewChecklistDisclaimer: '正確な最新のリリース規定はOGQクリエイタースタジオの公式案内をご確認ください。このチェックリストは参考用です。',
    reviewUploadTitle: 'または画像を直接アップロード',
    reviewUploadDesc: 'プロジェクトなしでも、完成したスタンプ画像だけでOGQの規格をすぐ確認できます。',
    reviewUploadDrop: '画像を選ぶかドラッグ&ドロップしてください',
    reviewUploadHint: 'OGQ公式基準・メイン240×240・スタンプ740×640・タブ96×74・各1MB以下・PNG・透明背景',
    reviewUploadSelectFile: '画像を選ぶ',
    reviewUploadRemove: '削除',
    reviewUploadDisclaimer: 'この検査は規格を自動で確認するだけの参考情報です。実際のOGQ審査結果とは異なる場合があります。',
    reviewProjectCheckTitle: '選択したプロジェクトのOGQ規格検査',
    reviewProjectCheckDesc: '選択したプロジェクトの画像{n}件を自動検査します。',
    reviewProjectCheckLoading: 'プロジェクト画像を検査中...',
    reviewProjectCheckFailed: 'プロジェクト画像を読み込めませんでした。選択を解除して再試行してください。',
    reviewCheckFormatLabel: 'ファイル形式',
    reviewCheckSizeLabel: '容量',
    reviewCheckDimensionsLabel: 'サイズ規格',
    reviewCheckTransparencyLabel: '透明背景',
    reviewCheckMarginLabel: '余白',
    reviewCheckFormatPass: 'PNG形式です。',
    reviewCheckFormatFail: '{type}形式です。透明背景に対応したPNGで保存してください。',
    reviewCheckSizePass: '{size} — 1MB以下です。',
    reviewCheckSizeFail: '{size} — 1MBを超えています。容量を減らしてください。',
    reviewCheckDimensionsPass: '{w}×{h}px — {category}規格に合っています。',
    reviewCheckDimensionsFail: '{w}×{h}px — メイン240×240、スタンプ740×640、タブ96×74のどれにも合いません。',
    reviewCheckTransparencyPass: '透明背景を確認しました。',
    reviewCheckTransparencyFail: '背景が透明ではありません。アルファチャンネル付きのPNGで書き出してください。',
    reviewCheckMarginPass: 'キャラクター周りの余白が十分です。',
    reviewCheckMarginWarn: 'キャラクターが端に寄りすぎています。余白をもう少し取ってください。',
    reviewCheckMarginUnknown: '透明背景がないため余白を測定できません。',
    reviewCategoryMain: 'メイン画像',
    reviewCategorySticker: 'スタンプ画像',
    reviewCategoryTab: 'タブ画像',
    reviewCheckAllPass: 'すべての項目に合格しました!',
    reviewCheckIssues: '{n}件の項目を確認してください。',
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
    nfTitle: 'ページが見つかりません😭',
    nfDesc: 'アドレスが変わったか、存在しないページです。',
    nfHome: 'ホームに戻る',
    navLogin: 'ログイン',
    navLogout: 'ログアウト',
    loginTitle: 'おかえりなさい',
    loginSubtitle: 'ログインして絵文字翻訳の履歴を続けましょう。',
    loginTabLogin: 'ログイン',
    loginTabSignup: '新規登録',
    loginEmailLabel: 'メールアドレス',
    loginEmailPlaceholder: 'you@example.com',
    loginPasswordLabel: 'パスワード',
    loginPasswordPlaceholder: '8文字以上で入力してください',
    loginNameLabel: '名前',
    loginNamePlaceholder: 'ニックネーム',
    loginNameOptional: '(任意)',
    loginSubmitLogin: 'ログイン',
    loginSubmitSignup: '新規登録',
    loginDivider: 'または',
    loginNaverCta: 'NAVERアカウントでログイン',
    loginGoogleCta: 'Googleで続行',
    loginGooglePreparing: 'Googleログインを準備中…',
    loginGoogleProcessing: 'Googleログインを処理中…',
    loginGoogleNotConfigured: 'Googleログインはまだ設定されていません。',
    loginSwitchToSignup: 'アカウントをお持ちでないですか？ 新規登録',
    loginSwitchToLogin: 'すでにアカウントをお持ちですか？ ログイン',
    loginBackHome: 'ホームへ',
    loginNaverProcessing: 'NAVERログインを処理しています…',
    loginNaverFailed: 'NAVERログインに失敗しました。',
    loginNaverBack: 'ログイン画面に戻る',
    loginGoogleFailed: 'Googleログインに失敗しました。',
    loginSuccessToast: 'ログイン完了！',
  },
  zh: {
    cloudLogin: '请登录以将任务保存到云端。',
    cloudSaving: '正在保存到云端…',
    cloudSaved: '已保存到账户',
    cloudSaveFailed: '云端保存失败，请重试。',
    cloudRetry: '重试',
    cloudInProgress: '进行中的任务',
    cloudArchive: '任务归档',
    cloudEmptyProgress: '没有进行中的任务，开始本地化或生成表情贴纸吧。',
    cloudEmptyArchive: '暂无已完成的任务。',
    cloudLoading: '正在加载任务…',
    cloudListFailed: '无法加载任务列表。',
    cloudOpen: '打开任务',
    cloudRecent: '最近保存',
    cloudNewConfirm: '关闭当前任务并新建任务吗？云端已保存的任务会保留。',
    cloudNewTitle: '开始新任务？',
    cloudNewProceed: '开始新任务',
    cloudDelete: '删除',
    cloudDeleteTitle: '删除此任务？',
    cloudDeleteDescription: '“{name}”以及已保存的图片和编辑内容将全部删除，且无法恢复。',
    cloudDeleteConfirm: '永久删除',
    cloudDeleteCancel: '取消',
    cloudDeleteSuccess: '任务已删除。',
    cloudDeleteFailed: '无法删除任务，请重试。',
    commonClose: '关闭',

    hubDashboard: '控制台',
    hubTitle: '想开始什么工作？',
    hubSubtitle: '与Glocalizer一起制作、本地化表情并准备发布。',
    hubLocalize: '表情本地化',
    hubLocalizeDesc: '将表情中的文字转换为其他语言的自然表达。',
    hubReview: 'OGQ发布检查',
    hubReviewDesc: '帮助您在发布前检查表情。',
    hubGenerate: '表情生成',
    hubGenerateDesc: '将想法变成新的表情。',
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
    accountTitle: '设置',
    accountDesc: '查看并管理你的Glocalizer账户信息。',
    accountName: '昵称',
    accountEmail: '邮箱',
    accountSignupMethod: '已关联的登录方式',
    accountEmailLogin: '邮箱登录',
    accountNaverLogin: 'Naver 登录',
    accountGoogleLogin: 'Google 登录',
    accountChecking: '正在确认',
    accountMissing: '暂无信息',
    accountMenu: '个人资料菜单',
    accountEdit: '编辑个人资料',
    accountSave: '保存',
    accountCancel: '取消',
    accountChangePhoto: '更换照片',
    accountRemovePhoto: '恢复默认',
    accountNameRequired: '请输入昵称。',
    accountSaved: '个人资料已保存。',
    accountSaveFailed: '个人资料保存失败。',
    accountPhotoInvalid: '仅支持10MB以内的图片文件。',
    accountDangerZoneTitle: '危险区域',
    accountDangerZoneDesc: '删除账户后，已保存的所有项目、图片和个人资料信息都会被永久删除，且无法恢复。',
    accountDeleteButton: '删除账户',
    accountDeleteConfirm: '确定要删除账户吗？已保存的所有项目和图片也会一并删除，且无法恢复。',
    accountDeleteFailed: '账户删除失败,请稍后重试。',
    accountDeleteSuccess: '账户已删除',
    accountDeleteProcessingTitle: '正在删除账户',
    accountDeleteProcessingDesc: '正在清理已保存的项目和图片,请稍候。',
    accountSecurityTitle: '安全',
    accountSecurityDesc: '可以修改通过邮箱注册的账户密码。',
    accountPasswordChangeCta: '修改密码',
    accountPasswordCurrentLabel: '当前密码',
    accountPasswordNewLabel: '新密码',
    accountPasswordConfirmLabel: '确认新密码',
    accountPasswordSubmit: '确认修改',
    accountPasswordCurrentRequired: '请输入当前密码。',
    accountPasswordTooShort: '新密码至少需要8个字符。',
    accountPasswordMismatch: '两次输入的新密码不一致。',
    accountPasswordSuccess: '密码已更新。',
    accountPasswordFailed: '密码更新失败，请稍后重试。',
    accountDeleteModalTitle: '删除账户',
    accountDeleteAckData: '我已了解已保存的所有项目、图片和个人资料信息将被永久删除且无法恢复。',
    accountDeleteAckResignup: '我已了解删除后可以用同一邮箱/账号重新注册，但之前的数据不会恢复。',
    accountDeleteConfirmCta: '确认删除',
    accountPolicyTitle: '政策与条款',
    accountPolicyDesc: '查看个人信息处理方式和服务使用条件。',
    privacyPolicy: '隐私政策',
    termsOfService: '服务条款',

    feedbackMenuLabel: '反馈',
    feedbackModalTitle: '发送反馈',
    feedbackModalDesc: '告诉我们不方便的地方或改进建议，会作为 Issue 提交到我们的 GitHub 仓库。',
    feedbackPlaceholder: '请自由留下您的意见（至少10个字）',
    feedbackSubmit: '发送',
    feedbackSending: '发送中…',
    feedbackSuccess: '反馈已发送，谢谢！',
    feedbackTooShort: '反馈至少需要输入10个字。',
    feedbackFailed: '反馈发送失败，请稍后重试。',
    feedbackCategoryBug: '错误',
    feedbackCategoryFeature: '功能建议',
    feedbackCategoryOther: '其他',

    navStart: '开始',
    navService: '服务介绍',
    heroBrandTag: 'Glocalizer',
    heroLine1: '表情',
    heroLine2: '本地化、检查、生成',
    heroLine2Roll: ['本地化', '检查', '生成'],
    heroDesc: '从本地化、检查到生成,一站搞定表情包制作。',
    heroCta: '开始使用',
    heroReplay: '从头播放视频',
    beforeAfter: 'Before → After',
    cardTitle: '韩国梗变成本地表达',
    beforeLabel: 'Before · 原文',
    afterLabel: 'After · 转换',
    ogqGalleryTitle: 'OGQ市场的热门贴纸',
    ogqGalleryDesc: '像这样的表情包也能用 Glocalizer 轻松本地化。',
    ogqGalleryCredit: 'OGQ市场提供的免费贴纸',
    sampleTryLabel: 'OGQ贴纸',
    samplePickerTitle: '选择样例表情',
    samplePickerDesc: '先用 OGQ 市场的免费贴纸体验一下吧。',
    samplePickerLoading: '正在加载样例...',
    samplePickerError: '样例加载失败，请稍后重试。',
    samplePickerEmpty: '目前没有可用的样例。',
    reviewPickProjectTitle: '选择多个要检查的项目',
    reviewPickProjectDesc: '同时选择已完成的本地化和生成项目，按 OGQ 标准检查。',
    reviewProjectsLoading: '正在加载可检查的项目...',
    reviewProjectsEmpty: '还没有可以检查的已完成项目。',
    reviewProjectsEmptyCta: '去本地化表情包',
    reviewProjectsFailed: '项目列表加载失败。',
    reviewLoadingWorkspace: '正在分析项目文案...',
    reviewWorkspaceFailed: '项目加载失败，请稍后重试。',
    reviewSimilarTitle: '文案相似的现有贴纸',
    reviewSimilarDesc: '使用完成图片中识别出的文案搜索 OGQ 市场，方便你在上架前比较表达差异。',
    reviewNoKeywords: '没能在这个项目里找到可用于搜索的文案。',
    reviewKeywordEmpty: '没有找到文案相同或相似的贴纸。',
    reviewKeywordFailed: '搜索失败。',
    reviewAnimatedBadge: '动图',
    reviewAiTitle: 'AI 深度反馈',
    reviewAiDesc: '综合分析所选成品图片、OCR 和翻译结果，按优先级整理上架前需要改进的内容。',
    reviewAiCta: '获取深度反馈',
    reviewAiLoading: '正在分析...',
    reviewAiFailed: '无法生成深度反馈，请稍后重试。',
    reviewAiLimit: 'AI 深度反馈每次最多可分析 3 个项目。',
    reviewAiScore: 'AI 上架准备度',
    reviewAiStrengths: '做得好的地方',
    reviewAiFixes: '优先修改项',
    reviewAiImages: '逐图反馈',
    reviewAiLocalization: '本地化反馈',
    reviewChecklistTitle: 'OGQ 市场上架检查清单',
    reviewChecklistItems: [
      '准备透明背景的 PNG 图片(参考画布 740×640px,单张文件 1MB 以内)',
      '确认整套图片保持相同的角色、画风和配色',
      '为提高搜索曝光,在标题和标签中加入能体现真实情绪或场景的关键词',
      '确认没有未经授权使用有版权的角色、字体或图片',
      '确认没有色情或暴力内容',
    ],
    reviewChecklistDisclaimer: '准确的最新上架规定请以 OGQ 创作者工作室的官方说明为准,此清单仅供参考。',
    reviewUploadTitle: '或直接上传图片',
    reviewUploadDesc: '不需要项目,用完成的表情图片就能马上检查 OGQ 规格。',
    reviewUploadDrop: '选择图片或拖放到此处',
    reviewUploadHint: 'OGQ 官方标准 · 主图 240×240 · 表情 740×640 · 标签 96×74 · 每个 1MB 以内 · PNG · 透明背景',
    reviewUploadSelectFile: '选择图片',
    reviewUploadRemove: '删除',
    reviewUploadDisclaimer: '此检查仅自动核对规格,仅供参考,实际 OGQ 审核结果可能不同。',
    reviewProjectCheckTitle: '已选项目 OGQ 规格检查',
    reviewProjectCheckDesc: '自动检查已选项目中的 {n} 张图片。',
    reviewProjectCheckLoading: '正在检查项目图片...',
    reviewProjectCheckFailed: '无法加载项目图片。请取消选择后重试。',
    reviewCheckFormatLabel: '文件格式',
    reviewCheckSizeLabel: '容量',
    reviewCheckDimensionsLabel: '尺寸规格',
    reviewCheckTransparencyLabel: '透明背景',
    reviewCheckMarginLabel: '边距',
    reviewCheckFormatPass: '是 PNG 格式。',
    reviewCheckFormatFail: '是 {type} 格式。请保存为支持透明背景的 PNG。',
    reviewCheckSizePass: '{size} — 未超过 1MB。',
    reviewCheckSizeFail: '{size} — 超过了 1MB,请压缩文件大小。',
    reviewCheckDimensionsPass: '{w}×{h}px — 符合{category}规格。',
    reviewCheckDimensionsFail: '{w}×{h}px — 不符合主图 240×240、表情 740×640、标签 96×74 中的任何一种。',
    reviewCheckTransparencyPass: '已确认透明背景。',
    reviewCheckTransparencyFail: '背景不是透明的,请导出带 alpha 通道的 PNG。',
    reviewCheckMarginPass: '角色周围留白充足。',
    reviewCheckMarginWarn: '角色太靠近边缘了,请留出更多边距。',
    reviewCheckMarginUnknown: '没有透明背景,无法测量边距。',
    reviewCategoryMain: '主图',
    reviewCategorySticker: '表情图片',
    reviewCategoryTab: '标签图片',
    reviewCheckAllPass: '所有检查项都通过了!',
    reviewCheckIssues: '有 {n} 项需要确认。',
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
    nfTitle: '找不到页面😭',
    nfDesc: '地址可能已更改，或该页面不存在。',
    nfHome: '返回首页',
    navLogin: '登录',
    navLogout: '退出登录',
    loginTitle: '欢迎回来',
    loginSubtitle: '登录后可继续查看表情包翻译记录。',
    loginTabLogin: '登录',
    loginTabSignup: '注册',
    loginEmailLabel: '邮箱',
    loginEmailPlaceholder: 'you@example.com',
    loginPasswordLabel: '密码',
    loginPasswordPlaceholder: '至少8位字符',
    loginNameLabel: '姓名',
    loginNamePlaceholder: '昵称',
    loginNameOptional: '(可选)',
    loginSubmitLogin: '登录',
    loginSubmitSignup: '注册',
    loginDivider: '或',
    loginNaverCta: '使用 NAVER 账号登录',
    loginGoogleCta: '使用 Google 继续',
    loginGooglePreparing: '正在准备 Google 登录…',
    loginGoogleProcessing: '正在处理 Google 登录…',
    loginGoogleNotConfigured: '尚未配置 Google 登录。',
    loginSwitchToSignup: '还没有账号？去注册',
    loginSwitchToLogin: '已有账号？去登录',
    loginBackHome: '返回首页',
    loginNaverProcessing: '正在处理 NAVER 登录…',
    loginNaverFailed: 'NAVER 登录失败。',
    loginNaverBack: '返回登录页',
    loginGoogleFailed: 'Google 登录失败。',
    loginSuccessToast: '登录成功！',
  },
}
