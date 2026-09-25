import type { SiteLang } from './translations'

interface ServiceDict {
  home: string; title: string; intro: string; start: string; account: string
  heading: string; features: { title: string; description: string; details: string[]; action: string }[]
  workflow: string; steps: { title: string; description: string }[]
  notesTitle: string; notes: string[]
  faqTitle: string; faq: { question: string; answer: string }[]
}

export const serviceDict: Record<SiteLang, ServiceDict> = {
  ko: {
    faqTitle: "자주 묻는 질문",
    faq: [
      {
            "question": "이미 만들어 둔 이모티콘도 사용할 수 있나요?",
            "answer": "네. 생성 단계를 거치지 않고 현지화에서 PNG·JPG 이미지를 직접 올릴 수 있습니다. 이미지 속 한국어를 인식해 영어·일본어·중국어 후보를 제공하며, 원문과 번역문은 직접 수정할 수 있습니다."
      },
      {
            "question": "사이트 언어를 바꾸면 이미지도 번역되나요?",
            "answer": "아니요. 상단 언어 선택은 화면 안내와 약관의 표시 언어를 바꿉니다. 이미지 번역은 현지화 작업에서 대상 언어를 선택해 별도로 실행합니다."
      },
      {
            "question": "어떤 결과를 다운로드할 수 있나요?",
            "answer": "생성한 이미지는 개별 다운로드가 가능하며, 24종 세트를 완성하면 ZIP으로 받을 수 있습니다. 현지화 결과도 PNG 이미지 또는 ZIP으로 내보낼 수 있습니다. 다운로드 전에 문구와 배치, 배경 정리 결과를 확인하세요."
      },
      {
            "question": "작업을 나중에 이어가거나 삭제할 수 있나요?",
            "answer": "로그인한 계정에 저장된 프로젝트는 대시보드에서 다시 열 수 있고, 완료한 프로젝트는 보관함에서 확인할 수 있습니다. 현지화 프로젝트는 보관함에서도 삭제할 수 있고, 생성 프로젝트의 삭제는 진행 중인 작업에서 제공합니다. 삭제한 프로젝트는 복구할 수 없으므로 필요한 결과는 먼저 다운로드하세요."
      },
      {
            "question": "출시 검토를 통과하면 OGQ에 자동 등록되나요?",
            "answer": "아니요. 규격 검사는 파일 형식·용량·크기·투명도·여백을 확인하는 보조 기능입니다. 관련 콘텐츠 검색과 AI 심층 검토도 참고용이며 공식 심사나 저작권 판단이 아닙니다. 최종 결과를 확인한 뒤 해당 플랫폼에 직접 제출해야 합니다."
      }
],
    home: '홈으로', title: '캐릭터 아이디어부터\n세계와 만나는 이모티콘까지',
    intro: '이모티콘 생성, 한국어 문구의 현지화, 출시 전 검토를 한곳에서 이어가세요. AI가 초안을 만들고, 창작자가 표현과 완성도를 결정합니다.',
    start: '작업 공간 시작하기', account: '생성·현지화 작업과 프로젝트 저장에는 로그인이 필요합니다.', heading: '지금 Glocalizer에서 할 수 있는 일',
    features: [
      { title: '캐릭터로 24종 이모티콘 만들기', description: '캐릭터 설명을 입력하고 필요하면 참고 이미지를 더해 다양한 감정과 상황의 이모티콘을 만드세요.', details: ['24개 슬롯의 생성 상태와 결과를 확인하고 필요한 이미지를 다시 생성합니다.', '문구와 글자 크기·색상·배치를 조정하고 개별 이미지를 다운로드합니다.', '24종을 완성하면 세트를 다운로드하거나 현지화·출시 검토로 이어갑니다.'], action: '이모티콘 생성하기' },
      { title: '한국어 표현을 3개 언어로 현지화', description: 'PNG·JPG 이미지의 한국어 문구를 인식하고 영어·일본어·중국어 표현으로 바꿉니다.', details: ['번역 후보를 비교하고 원문이나 번역문을 직접 수정합니다.', '글자 영역과 배경 정리 결과를 확인하고 에디터에서 글꼴·크기·색상·배치를 다듬습니다.', '원하는 언어의 결과를 다운로드합니다. 복잡한 배경은 수동 보정이 필요할 수 있습니다.'], action: '현지화 시작하기' },
      { title: '출시 전에 규격과 표현 점검', description: '파일 규격부터 프로젝트의 표현까지, 제출 전에 확인할 항목을 모아 살펴보세요.', details: ['PNG 형식, 파일 용량, 이미지 크기, 투명도와 여백을 검사합니다.', '프로젝트 문구와 관련된 OGQ 콘텐츠를 찾아 비교할 수 있습니다.', 'AI 심층 검토로 가독성, 캐릭터 일관성, 문구와 이미지의 어울림에 관한 피드백을 받습니다.'], action: '출시 검토하기' },
      { title: '저장한 프로젝트에서 작업 이어가기', description: '대시보드와 보관함에서 생성·현지화 프로젝트를 찾아 다시 열어보세요.', details: ['계정에 저장된 프로젝트와 진행 상태를 확인합니다.', '프로젝트를 다시 열어 결과를 확인하고 가능한 후속 작업을 이어갑니다.', '설정에서 닉네임과 프로필 이미지를 관리하고 필요한 경우 계정을 삭제합니다.'], action: '보관함 열기' },
    ],
    workflow: '내 작업에 맞는 단계부터 시작하세요',
    steps: [{ title: '만들거나 가져오기', description: '새 캐릭터로 생성하거나, 권한을 가진 기존 이모티콘을 현지화에 올립니다.' }, { title: '표현 다듬기', description: '이미지와 문구를 살펴보고 번역·글자 배치·배경 정리를 수정합니다.' }, { title: '검토하고 내보내기', description: '규격과 AI 피드백을 참고해 최종 확인한 뒤 결과를 다운로드합니다.' }],
    notesTitle: '시작 전에 확인해 주세요',
    notes: ['사이트 표시 언어는 한국어·영어·일본어·중국어이며, 이미지 현지화 대상은 영어·일본어·중국어입니다.', '생성과 AI 검토는 서비스 설정 및 이용 한도의 영향을 받습니다. 처리 시간은 이미지와 요청 상태에 따라 달라집니다.', 'AI 번역·이미지 생성·배경 정리 결과를 직접 확인해 주세요. 규격 검사와 AI 피드백은 OGQ 공식 심사나 출시 승인이 아닙니다.', '업로드·참고 이미지의 사용 권한을 확인하세요. 다운로드한 결과는 제출할 플랫폼의 최신 기준에 맞춰 직접 제출해야 합니다.'],
  },
  en: {
    faqTitle: "Frequently asked questions",
    faq: [
      {
            "question": "Can I use stickers I have already made?",
            "answer": "Yes. Upload PNG or JPG images directly in localization without generating new stickers. Korean text is recognized and English, Japanese and Chinese candidates are offered. You can edit both the source and translated text."
      },
      {
            "question": "Does changing the site language translate my images?",
            "answer": "No. The language selector changes the interface and legal documents. Image translation is a separate localization task where you choose the target languages."
      },
      {
            "question": "What can I download?",
            "answer": "Download generated images individually, or download a ZIP after completing the set of 24. Localized results can also be exported as PNG images or a ZIP. Check captions, placement and background cleanup before downloading."
      },
      {
            "question": "Can I resume or delete my work later?",
            "answer": "Reopen projects saved to your account from the dashboard. View completed projects in the archive. Localization projects can also be deleted there; generation project deletion is available for work in progress. Deleted projects cannot be recovered, so download any results you need first."
      },
      {
            "question": "Does passing release review automatically publish to OGQ?",
            "answer": "No. Specification checks assist with format, file size, dimensions, transparency and margins. Related-content search and in-depth AI feedback are references, not official review or copyright determinations. Check the final results and submit them to the platform yourself."
      }
],
    home: 'Home', title: 'From a character idea\nto stickers for the world',
    intro: 'Connect sticker creation, Korean-text localization and pre-release reviews in one workspace. AI provides a draft; you decide the expression and finish.',
    start: 'Open your workspace', account: 'Sign-in is required for generation, localization and saved projects.', heading: 'What you can do with Glocalizer today',
    features: [
      { title: 'Create a set of 24 character stickers', description: 'Describe your character and optionally add a reference image to create stickers for different emotions and situations.', details: ['Track generation and results across 24 slots and regenerate images when needed.', 'Adjust captions, text size, color and placement, then download individual images.', 'Complete all 24 to download the set or continue to localization and release review.'], action: 'Create stickers' },
      { title: 'Localize Korean text into three languages', description: 'Recognize Korean text in PNG and JPG images and adapt it into English, Japanese and Chinese.', details: ['Compare translation candidates and edit the source or translated text yourself.', 'Check text regions and background cleanup, then adjust font, size, color and placement in the editor.', 'Download results in your chosen languages. Complex backgrounds may need manual corrections.'], action: 'Start localizing' },
      { title: 'Check specifications and expression before release', description: 'Review file requirements and project content before submitting your stickers.', details: ['Check PNG format, file size, image dimensions, transparency and margins.', 'Find related OGQ content using your project’s text for comparison.', 'Get in-depth AI feedback on readability, character consistency and how well text matches the image.'], action: 'Review for release' },
      { title: 'Return to saved projects', description: 'Find and reopen generation and localization projects in the dashboard and archive.', details: ['View projects saved to your account and their progress.', 'Reopen projects to inspect results and continue available next steps.', 'Manage your nickname and profile image in Settings, or delete your account if needed.'], action: 'Open archive' },
    ],
    workflow: 'Start at the stage that fits your work',
    steps: [{ title: 'Create or bring your own', description: 'Generate a new character or upload existing stickers you have permission to use.' }, { title: 'Refine the expression', description: 'Review images and captions, and adjust translations, text placement and background cleanup.' }, { title: 'Review and export', description: 'Use specification checks and AI feedback for your final review, then download your results.' }],
    notesTitle: 'Before you start',
    notes: ['The website supports Korean, English, Japanese and Chinese. Image localization targets English, Japanese and Chinese.', 'Generation and AI reviews depend on service settings and usage limits. Processing time varies by image and request status.', 'Review AI translations, generated images and background cleanup yourself. Specification checks and AI feedback are not official OGQ reviews or release approval.', 'Check your rights to uploaded and reference images. Submit downloaded results yourself according to the destination platform’s current requirements.'],
  },
  ja: {
    faqTitle: "よくある質問",
    faq: [
      {
            "question": "既存のスタンプも使えますか？",
            "answer": "はい。新しく生成せず、ローカライズ画面にPNG・JPG画像を直接アップロードできます。韓国語を認識し、英語・日本語・中国語の候補を表示します。原文と翻訳文は直接編集できます。"
      },
      {
            "question": "サイトの言語を変えると画像も翻訳されますか？",
            "answer": "いいえ。言語選択は画面の案内と規約の表示言語を切り替えます。画像の翻訳はローカライズ画面で対象言語を選んで別途実行します。"
      },
      {
            "question": "何をダウンロードできますか？",
            "answer": "生成画像は個別に、24種類のセット完成後はZIPでダウンロードできます。ローカライズ結果もPNG画像またはZIPで書き出せます。文言・配置・背景処理を事前に確認してください。"
      },
      {
            "question": "後で作業を再開したり削除したりできますか？",
            "answer": "アカウントに保存したプロジェクトはダッシュボードから再度開けます。完了したプロジェクトはアーカイブで確認できます。ローカライズプロジェクトはアーカイブでも削除でき、生成プロジェクトの削除は進行中の作業で利用できます。削除後は復元できないため、必要な結果を先にダウンロードしてください。"
      },
      {
            "question": "チェックに通ればOGQに自動公開されますか？",
            "answer": "いいえ。規格チェックは形式・容量・サイズ・透明度・余白を確認する補助機能です。関連コンテンツ検索とAI詳細チェックも参考情報であり、公式審査や著作権判断ではありません。最終結果を確認し、ご自身で提出してください。"
      }
],
    home: 'ホームへ', title: 'キャラクターのアイデアから\n世界に届くスタンプへ',
    intro: 'スタンプ生成、韓国語のローカライズ、公開前チェックをひとつの作業スペースで。AIが下書きを作り、表現と仕上がりはクリエイターが決めます。',
    start: '作業スペースを開く', account: '生成・ローカライズとプロジェクト保存にはログインが必要です。', heading: '今、Glocalizerでできること',
    features: [
      { title: 'キャラクターから24種類のスタンプを生成', description: 'キャラクターを説明し、必要に応じて参考画像を追加して、さまざまな感情や場面のスタンプを作ります。', details: ['24枠の生成状況と結果を確認し、必要な画像を再生成します。', '文言、文字サイズ、色、配置を調整し、個別画像をダウンロードします。', '24種類を完成させると、セットをダウンロードしたり、ローカライズや公開前チェックへ進めます。'], action: 'スタンプを生成' },
      { title: '韓国語の表現を3言語へ', description: 'PNG・JPG画像内の韓国語を認識し、英語・日本語・中国語の表現に変換します。', details: ['翻訳候補を比較し、原文や翻訳文を直接編集できます。', '文字領域と背景の処理結果を確認し、エディターでフォント・サイズ・色・配置を調整します。', '選択した言語の結果をダウンロードします。複雑な背景には手動修正が必要な場合があります。'], action: 'ローカライズを始める' },
      { title: '公開前に規格と表現をチェック', description: '提出前にファイル規格とプロジェクトの表現を確認します。', details: ['PNG形式、ファイル容量、画像サイズ、透明度、余白を検査します。', 'プロジェクトの文言に関連するOGQコンテンツを探して比較できます。', 'AI詳細チェックで、読みやすさ、キャラクターの一貫性、文言と画像の相性についてフィードバックを得られます。'], action: '公開前チェックへ' },
      { title: '保存したプロジェクトを再開', description: 'ダッシュボードとアーカイブから生成・ローカライズのプロジェクトを開けます。', details: ['アカウントに保存したプロジェクトと進捗を確認します。', 'プロジェクトを再度開き、結果の確認や利用可能な次の作業へ進めます。', '設定でニックネームとプロフィール画像を管理し、必要に応じて退会できます。'], action: 'アーカイブを開く' },
    ],
    workflow: '自分の作業に合う段階から',
    steps: [{ title: '作る・持ち込む', description: '新しいキャラクターを生成するか、利用権限のある既存スタンプをアップロードします。' }, { title: '表現を整える', description: '画像と文言を確認し、翻訳・文字配置・背景処理を修正します。' }, { title: '確認して書き出す', description: '規格チェックとAIの意見を参考に最終確認し、結果をダウンロードします。' }],
    notesTitle: '始める前に',
    notes: ['サイト表示は韓国語・英語・日本語・中国語に対応。画像のローカライズ先は英語・日本語・中国語です。', '生成とAIチェックはサービス設定や利用上限に左右されます。処理時間は画像やリクエスト状況によって異なります。', 'AI翻訳・生成画像・背景処理はご自身で確認してください。規格チェックとAIフィードバックはOGQの公式審査や公開承認ではありません。', 'アップロード画像と参考画像の利用権限をご確認ください。ダウンロード後は提出先の最新基準に従い、ご自身で提出してください。'],
  },
  zh: {
    faqTitle: "常见问题",
    faq: [
      {
            "question": "可以使用已经制作好的表情包吗？",
            "answer": "可以。无需重新生成，直接在本地化页面上传PNG或JPG图片。系统识别韩文并提供英语、日语和中文候选，原文和译文均可自行修改。"
      },
      {
            "question": "切换网站语言会翻译图片吗？",
            "answer": "不会。语言选择器切换界面说明和法律文档的显示语言。图片翻译需要在本地化任务中选择目标语言后单独执行。"
      },
      {
            "question": "可以下载什么结果？",
            "answer": "生成图片可单张下载，完成24张整套后可下载ZIP。本地化结果也可导出为PNG图片或ZIP。下载前请检查文案、位置和背景清理效果。"
      },
      {
            "question": "之后可以继续或删除项目吗？",
            "answer": "账号中保存的项目可从工作台重新打开，已完成项目可在归档中查看。本地化项目也可在归档中删除；生成项目的删除功能仅在进行中的任务中提供。删除后无法恢复，请先下载需要的结果。"
      },
      {
            "question": "通过发布前检查就会自动发布到OGQ吗？",
            "answer": "不会。规格检查辅助确认格式、文件大小、尺寸、透明度和留白。相关内容搜索和AI深度检查也仅供参考，不属于官方审核或版权判定。请核对最终结果并自行向平台提交。"
      }
],
    home: '返回首页', title: '从角色创意\n到走向世界的表情包',
    intro: '在同一工作空间串联表情包生成、韩文内容本地化与发布前检查。AI 提供初稿，创作者决定表达和最终效果。',
    start: '打开工作空间', account: '生成、本地化和项目保存需要登录。', heading: '现在可以用 Glocalizer 做什么',
    features: [
      { title: '用角色创作 24 张表情包', description: '描述角色，并按需添加参考图片，生成不同情绪和场景的表情包。', details: ['查看 24 个位置的生成进度和结果，按需重新生成图片。', '调整文案、字号、颜色和位置，下载单张图片。', '完成全部 24 张后，下载整套或继续本地化与发布前检查。'], action: '生成表情包' },
      { title: '将韩文表达本地化为三种语言', description: '识别 PNG、JPG 图片中的韩文，并转换为英语、日语和中文表达。', details: ['比较翻译候选，自行修改原文或译文。', '检查文字区域和背景清理效果，在编辑器中调整字体、大小、颜色与位置。', '下载所选语言的结果。复杂背景可能需要手动修正。'], action: '开始本地化' },
      { title: '发布前检查规格与表达', description: '提交前集中检查文件要求和项目内容。', details: ['检查 PNG 格式、文件大小、图片尺寸、透明度与留白。', '根据项目文案查找相关 OGQ 内容，进行对比。', '通过 AI 深度检查，获取可读性、角色一致性以及文案与图片契合度方面的反馈。'], action: '检查发布准备情况' },
      { title: '继续已保存的项目', description: '从工作台和归档中找到并重新打开生成、本地化项目。', details: ['查看账号中保存的项目及其进度。', '重新打开项目查看结果，继续可用的后续操作。', '在设置中管理昵称和头像，或按需注销账号。'], action: '打开归档' },
    ],
    workflow: '从适合自己的阶段开始',
    steps: [{ title: '生成或导入', description: '生成新角色，或上传拥有使用权限的现有表情包。' }, { title: '打磨表达', description: '检查图片和文案，调整翻译、文字位置及背景清理效果。' }, { title: '检查并导出', description: '参考规格检查与 AI 反馈，完成最终确认后下载结果。' }],
    notesTitle: '开始前请确认',
    notes: ['网站支持韩语、英语、日语和中文；图片本地化的目标语言为英语、日语和中文。', '生成和 AI 检查受服务设置及使用额度影响。处理时间因图片和请求状态而异。', '请自行检查 AI 翻译、生成图片与背景清理效果。规格检查和 AI 反馈不属于 OGQ 官方审核或发布批准。', '请确认上传图片和参考图片的使用权限。下载后需按照目标平台的最新要求自行提交。'],
  },
}
