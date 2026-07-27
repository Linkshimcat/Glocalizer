import type { SiteLang } from './translations'

interface Item {
  title: string
  desc: string
}

export interface ServiceDict {
  back: string
  titleMain: string
  titleAccent: string
  tagline: string
  intro: string
  worryHead: string
  worryLead: string
  worries: Item[]
  worryTail: string
  whyHead: string
  whys: Item[]
  doHead: string
  doAccent: string
  do1: string
  do2: string
  proAlt: string
  featHead: string
  featAccent: string
  features: Item[]
  videoHead: string
  // 하단 데모 카드
  demoStep: string
  demoTitle: string
  demoDesc: string
  demoDropTitle: string
  demoDropSub: string
  demoSelectFile: string
  demoLangTitle: string
  demoSelectAll: string
  demoStart: string
  demoHint: string
}

export const serviceDict: Record<SiteLang, ServiceDict> = {
  ko: {
    back: '돌아가기',
    titleMain: 'Glocalizer',
    titleAccent: '서비스 소개',
    tagline: '“K-이모티콘, 클릭 한 번으로 전 세계 언어가 되다.”',
    intro: '한국 이모티콘 속 한글을 AI가 지우고, 그 나라 감성에 맞는 표현으로 바꿔주는 현지화 서비스예요.',
    worryHead: '이런 고민, 해보셨나요? 🤔',
    worryLead: '창작자가 국내에서 만든 이모티콘을 해외 마켓에 올리려면, 매번 두 가지 벽에 부딪혀요.',
    worries: [
      { title: '번역의 벽', desc: '“열공”, “대박” 같은 밈은 단순 번역기로는 맛이 안 살아요. “Hard study”가 아니라 “Grinding”처럼 그 나라 Z세대가 쓰는 말이어야 하죠.' },
      { title: '이미지 수정의 벽', desc: '이미지 속 한글을 일일이 지우고, 새 언어를 다시 얹는 포토샵 작업을 이모티콘 개수만큼 반복해야 해요.' },
    ],
    worryTail: '이 귀찮고 어려운 과정 때문에, 좋은 이모티콘이 국내에만 머무는 경우가 많아요.',
    whyHead: '왜 Glocalizer인가요?',
    whys: [
      { title: '밈까지 살리는 번역', desc: '뜻만 맞는 게 아니라, 현지에서 실제로 쓰는 말맛까지 담아요.' },
      { title: '포토샵 없이 몇 초', desc: '전문 툴 없이도 누구나 이미지 속 글자를 바꿀 수 있어요.' },
      { title: '문턱 제로', desc: '로그인·결제 없이 바로 써볼 수 있어요.' },
    ],
    doHead: 'Glocalizer가',
    doAccent: '대신 해드려요!',
    do1: '이미지를 올리기만 하면, AI가 한글 감지 → 삭제 → 현지 표현으로 재삽입까지 몇 초 만에 끝내줘요. 창작자는 다운로드만 하면 바로 글로벌 마켓에 올릴 수 있어요.',
    do2: '회원가입도 필요 없어요. 접속해서 바로 올리고, 바꾸고, 받으면 끝이에요.',
    proAlt: '사진 업로드, 한국어에서 현지화 번역, 이모티콘 다운로드로 이어지는 3단계 과정',
    featHead: '핵심 기능',
    featAccent: '3가지',
    features: [
      { title: '1. AI 초월 번역', desc: '단순 직역이 아니라, 타깃 국가의 문화와 밈을 반영한 표현으로 바꿔요. 후보를 여러 개 보여줘서 마음에 드는 걸 고르거나, 직접 입력할 수도 있어요.' },
      { title: '2. 스마트 캔버스', desc: '이미지 속 한글을 깔끔하게 지우고 투명 배경을 유지해요. 그 위에 번역 텍스트를 얹고 폰트·크기·색상·회전·테두리·그림자까지 자유롭게 다듬을 수 있어요.' },
      { title: '3. 바로 다운로드', desc: '완성된 이모티콘을 PNG · JPG 낱장 또는 ZIP으로 한 번에 받아요.' },
    ],
    videoHead: '# 플랫폼 사용 방법 [영상]',
    demoStep: '1단계 · 업로드',
    demoTitle: '이모티콘을 올려주세요',
    demoDesc: 'PNG, JPG 파일을 끌어다 놓으면 바로 시작할 수 있어요.',
    demoDropTitle: '파일을 여기에 끌어다 놓으세요',
    demoDropSub: 'PNG · JPG · 여러 장을 한 번에 올릴 수 있어요',
    demoSelectFile: '파일 선택',
    demoLangTitle: '번역할 언어를 골라주세요',
    demoSelectAll: '전체 선택',
    demoStart: '번역 시작하기 →',
    demoHint: '이모티콘을 먼저 올려주세요.',
  },
  en: {
    back: 'Back',
    titleMain: 'Glocalizer',
    titleAccent: 'Service intro',
    tagline: '“K-emojis, in every language with one click.”',
    intro: 'An AI localization service that erases the Korean text in your emojis and swaps in expressions that fit each culture.',
    worryHead: 'Sound familiar? 🤔',
    worryLead: 'To put locally made emojis on overseas markets, creators keep hitting two walls.',
    worries: [
      { title: 'The translation wall', desc: 'Memes like “열공” or “대박” lose their flavor in a plain translator. It has to be “Grinding,” not “Hard study” — the words a local Gen Z actually uses.' },
      { title: 'The image-editing wall', desc: 'You erase the Korean by hand and re-lay new text in Photoshop, repeated once for every single emoji.' },
    ],
    worryTail: 'Because it is so tedious, great emojis often never leave their home country.',
    whyHead: 'Why Glocalizer?',
    whys: [
      { title: 'Translation that keeps the meme', desc: 'Not just the meaning — we capture how people actually talk locally.' },
      { title: 'Seconds, no Photoshop', desc: 'Anyone can change the text in an image without pro tools.' },
      { title: 'Zero barrier', desc: 'No login, no payment — just try it right away.' },
    ],
    doHead: 'Glocalizer',
    doAccent: 'does it for you!',
    do1: 'Just upload an image and the AI detects the Korean, removes it, and re-inserts a local expression — all in seconds. Creators just download and publish to global markets.',
    do2: 'No sign-up needed. Open it, upload, convert, download — done.',
    proAlt: 'Three steps: upload photo, localize from Korean, download emoji',
    featHead: 'Three core',
    featAccent: 'features',
    features: [
      { title: '1. Beyond-literal AI translation', desc: 'Not a literal translation — expressions that reflect the target culture and memes. See several candidates to pick from, or type your own.' },
      { title: '2. Smart canvas', desc: 'Cleanly erases the Korean and keeps the transparent background. Lay translated text on top and tune font, size, color, rotation, stroke and shadow freely.' },
      { title: '3. Instant download', desc: 'Grab finished emojis as PNG · JPG singles or all at once as a ZIP.' },
    ],
    videoHead: '# How to use the platform [video]',
    demoStep: 'Step 1 · Upload',
    demoTitle: 'Upload your emojis',
    demoDesc: 'Drag and drop PNG or JPG files to get started.',
    demoDropTitle: 'Drag files here',
    demoDropSub: 'PNG · JPG · upload several at once',
    demoSelectFile: 'Choose files',
    demoLangTitle: 'Choose target languages',
    demoSelectAll: 'Select all',
    demoStart: 'Start translating →',
    demoHint: 'Please upload an emoji first.',
  },
  ja: {
    back: '戻る',
    titleMain: 'Glocalizer',
    titleAccent: 'サービス紹介',
    tagline: '「K-絵文字、ワンクリックで世界の言語へ。」',
    intro: '韓国の絵文字の中の韓国語をAIが消し、その国の感性に合う表現に置き換えるローカライズサービスです。',
    worryHead: 'こんな悩み、ありませんか？ 🤔',
    worryLead: '国内で作った絵文字を海外マーケットに出そうとすると、毎回2つの壁にぶつかります。',
    worries: [
      { title: '翻訳の壁', desc: '「열공」「대박」のようなミームは、ただの翻訳機では味が出ません。「Hard study」ではなく「Grinding」のように、その国のZ世代が使う言葉であるべきです。' },
      { title: '画像修正の壁', desc: '画像の中の韓国語を一つずつ消し、新しい言語を載せ直すPhotoshop作業を、絵文字の数だけ繰り返す必要があります。' },
    ],
    worryTail: 'この面倒で難しい工程のせいで、良い絵文字が国内に留まってしまうことが多いのです。',
    whyHead: 'なぜGlocalizerなのか？',
    whys: [
      { title: 'ミームまで活かす翻訳', desc: '意味が合うだけでなく、現地で実際に使われる言葉のニュアンスまで込めます。' },
      { title: 'Photoshopなしで数秒', desc: '専門ツールがなくても、誰でも画像の中の文字を変えられます。' },
      { title: 'ハードル0', desc: 'ログイン・決済なしですぐ試せます。' },
    ],
    doHead: 'Glocalizerが',
    doAccent: '代わりにやります！',
    do1: '画像をアップロードするだけで、AIが韓国語の検出 → 削除 → 現地表現の再挿入まで数秒で完了。クリエイターはダウンロードするだけで、すぐグローバルマーケットに出せます。',
    do2: '会員登録も不要。アクセスしてすぐアップロード、変換、ダウンロードで完了です。',
    proAlt: '写真アップロード、韓国語からのローカライズ翻訳、絵文字ダウンロードの3ステップ',
    featHead: '主要機能',
    featAccent: '3つ',
    features: [
      { title: '1. AI超越翻訳', desc: '単なる直訳ではなく、ターゲット国の文化とミームを反映した表現に変換。候補を複数表示し、選ぶことも直接入力することもできます。' },
      { title: '2. スマートキャンバス', desc: '画像の中の韓国語をきれいに消し、透明背景を保ちます。その上に翻訳テキストを載せ、フォント・サイズ・色・回転・縁取り・影まで自由に調整できます。' },
      { title: '3. すぐダウンロード', desc: '完成した絵文字をPNG · JPGの単体、またはZIPで一括ダウンロードできます。' },
    ],
    videoHead: '# プラットフォームの使い方 [動画]',
    demoStep: 'ステップ1 · アップロード',
    demoTitle: '絵文字をアップロード',
    demoDesc: 'PNG・JPGファイルをドラッグ&ドロップですぐ始められます。',
    demoDropTitle: 'ここにファイルをドロップ',
    demoDropSub: 'PNG · JPG · 複数枚を一度にアップロードできます',
    demoSelectFile: 'ファイルを選択',
    demoLangTitle: '翻訳する言語を選んでください',
    demoSelectAll: 'すべて選択',
    demoStart: '翻訳を始める →',
    demoHint: 'まず絵文字をアップロードしてください。',
  },
  zh: {
    back: '返回',
    titleMain: 'Glocalizer',
    titleAccent: '服务介绍',
    tagline: '“K-表情包，一键变成全球语言。”',
    intro: '一款用 AI 抹去韩国表情包里的韩文，并替换成符合当地语感表达的本地化服务。',
    worryHead: '你有过这些烦恼吗？ 🤔',
    worryLead: '创作者想把本国制作的表情包上架到海外市场时，每次都会撞上两道墙。',
    worries: [
      { title: '翻译之墙', desc: '“열공”“대박”这类梗，用普通翻译器根本没了味道。要像“Grinding”而不是“Hard study”，得是当地 Z 世代真正在用的说法。' },
      { title: '图像修改之墙', desc: '要逐个抹掉图片里的韩文，再用 Photoshop 重新叠上新语言，有多少张表情包就要重复多少次。' },
    ],
    worryTail: '正因为这个过程既麻烦又困难，很多好表情包只能停留在国内。',
    whyHead: '为什么选 Glocalizer？',
    whys: [
      { title: '连梗一起翻译', desc: '不只是意思对，还要还原当地真正在用的语感。' },
      { title: '无需 Photoshop，几秒搞定', desc: '没有专业工具，任何人都能改图片里的文字。' },
      { title: '零门槛', desc: '无需登录和付费，马上就能试用。' },
    ],
    doHead: 'Glocalizer',
    doAccent: '帮你搞定！',
    do1: '只要上传图片，AI 就会在几秒内完成韩文检测 → 删除 → 替换成本地表达。创作者只需下载，就能直接上架全球市场。',
    do2: '也无需注册。打开即可上传、转换、下载，一步到位。',
    proAlt: '上传照片、从韩语本地化翻译、下载表情包的三步流程',
    featHead: '三大核心',
    featAccent: '功能',
    features: [
      { title: '1. AI 超越翻译', desc: '不是简单直译，而是转换成反映目标国家文化与梗的表达。提供多个候选供你选择，也可以自己输入。' },
      { title: '2. 智能画布', desc: '干净地抹去图片里的韩文并保留透明背景。在其上叠加翻译文字，字体、大小、颜色、旋转、描边、阴影都可自由调整。' },
      { title: '3. 即时下载', desc: '把做好的表情包按 PNG · JPG 单张，或打包成 ZIP 一次下载。' },
    ],
    videoHead: '# 平台使用方法 [视频]',
    demoStep: '第 1 步 · 上传',
    demoTitle: '请上传表情包',
    demoDesc: '拖入 PNG、JPG 文件即可立即开始。',
    demoDropTitle: '把文件拖到这里',
    demoDropSub: 'PNG · JPG · 可一次上传多张',
    demoSelectFile: '选择文件',
    demoLangTitle: '请选择翻译语言',
    demoSelectAll: '全选',
    demoStart: '开始翻译 →',
    demoHint: '请先上传表情包。',
  },
}
