import type { SiteLang } from './translations'

const copy = {
  reviewPickProjectTitle: ['검토할 프로젝트를 복수 선택하세요', 'Choose multiple projects to review', 'レビューするプロジェクトを複数選択', '选择多个要检查的项目'],
  reviewPickProjectDesc: ['완료된 현지화 프로젝트와 생성 프로젝트를 함께 선택해 OGQ 기준으로 검수해요.', 'Select finished localization and generation projects together for an OGQ spec review.', '完了したローカライズと生成プロジェクトをまとめてOGQ基準で確認します。', '同时选择已完成的本地化和生成项目，按 OGQ 标准检查。'],
  reviewProjectsLoading: ['검토 가능한 프로젝트를 불러오는 중...', 'Loading projects available for review...', 'レビュー可能なプロジェクトを読み込み中...', '正在加载可检查的项目...'],
  reviewProjectsEmpty: ['아직 검토할 수 있는 완료된 프로젝트가 없어요.', "You don't have any finished projects to review yet.", 'まだレビューできる完了プロジェクトがありません。', '还没有可以检查的已完成项目。'],
  reviewProjectsEmptyCta: ['이모티콘 현지화하러 가기', 'Go localize an emoticon', '絵文字をローカライズしに行く', '去本地化表情包'],
  reviewProjectsFailed: ['프로젝트 목록을 불러오지 못했어요.', "Couldn't load your projects.", 'プロジェクト一覧を読み込めませんでした。', '项目列表加载失败。'],
  reviewLoadingWorkspace: ['프로젝트 문구를 분석하는 중...', 'Analyzing project captions...', 'プロジェクトの文言を分析中...', '正在分析项目文案...'],
  reviewWorkspaceFailed: ['프로젝트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.', "Couldn't load the project. Please try again.", 'プロジェクトを読み込めませんでした。しばらくしてから再試行してください。', '项目加载失败，请稍后重试。'],
  reviewSimilarTitle: ['비슷한 문구의 기존 스티커', 'Existing stickers with similar captions', '似た文言の既存スティッカー', '文案相似的现有贴纸'],
  reviewSimilarDesc: ['완성 이미지에서 인식한 문구로 OGQ 마켓을 검색해요. 출시 전 표현의 차별점을 참고해보세요.', 'We search OGQ Market using captions recognized in your finished images, so you can compare wording before launch.', '完成画像から認識した文言でOGQマーケットを検索し、リリース前に表現の違いを比較できます。', '使用完成图片中识别出的文案搜索 OGQ 市场，方便你在上架前比较表达差异。'],
  reviewNoKeywords: ['프로젝트에서 검색에 쓸 문구를 찾지 못했어요.', "We couldn't find any captions to search with in this project.", 'プロジェクトから検索に使える文言が見つかりませんでした。', '没能在这个项目里找到可用于搜索的文案。'],
  reviewKeywordEmpty: ['같거나 비슷한 문구의 스티커를 찾지 못했어요.', 'No stickers with the same or similar captions were found.', '同じ、または似た文言のスティッカーが見つかりませんでした。', '没有找到文案相同或相似的贴纸。'],
  reviewKeywordFailed: ['검색에 실패했어요.', 'Search failed.', '検索に失敗しました。', '搜索失败。'],
  reviewAnimatedBadge: ['움직임', 'Animated', 'アニメーション', '动图'],
  reviewAiTitle: ['AI 심층 피드백', 'AI deep feedback', 'AI詳細フィードバック', 'AI 深度反馈'],
  reviewAiDesc: ['선택한 완성 이미지와 OCR·번역 결과를 함께 분석해 출시 전에 개선할 부분을 우선순위로 정리해요.', 'Analyze the selected finished images together with OCR and translations to prioritize improvements before release.', '選択した完成画像とOCR・翻訳結果をまとめて分析し、リリース前の改善点を優先順に整理します。', '综合分析所选成品图片、OCR 和翻译结果，按优先级整理上架前需要改进的内容。'],
  reviewAiCta: ['심층 피드백 받기', 'Get deep feedback', '詳細フィードバックを受ける', '获取深度反馈'],
  reviewAiLoading: ['분석 중...', 'Analyzing...', '分析中...', '正在分析...'],
  reviewAiFailed: ['심층 피드백을 만들지 못했어요. 잠시 후 다시 시도해주세요.', "Couldn't generate deep feedback. Please try again.", '詳細フィードバックを作成できませんでした。しばらくしてから再試行してください。', '无法生成深度反馈，请稍后重试。'],
  reviewAiLimit: ['AI 심층 피드백은 한 번에 프로젝트 3개까지 분석할 수 있어요.', 'AI deep feedback can analyze up to 3 projects at a time.', 'AI詳細フィードバックは一度に3件まで分析できます。', 'AI 深度反馈每次最多可分析 3 个项目。'],
  reviewAiScore: ['AI 출시 준비도', 'AI release readiness', 'AIリリース準備度', 'AI 上架准备度'],
  reviewAiStrengths: ['잘된 점', 'What works well', '良い点', '做得好的地方'],
  reviewAiFixes: ['우선 수정할 점', 'Priority improvements', '優先して修正する点', '优先修改项'],
  reviewAiImages: ['이미지별 피드백', 'Feedback by image', '画像別フィードバック', '逐图反馈'],
  reviewAiLocalization: ['현지화 피드백', 'Localization feedback', 'ローカライズフィードバック', '本地化反馈'],
  reviewChecklistTitle: ['OGQ 마켓 출시 체크리스트', 'OGQ Market launch checklist', 'OGQマーケットリリースチェックリスト', 'OGQ 市场上架检查清单'],
  reviewChecklistDisclaimer: ['정확한 최신 출시 규정은 OGQ 크리에이터 스튜디오의 공식 안내를 확인해주세요. 이 체크리스트는 참고용입니다.', 'For the current official submission requirements, please check OGQ Creator Studio directly — this checklist is for reference only.', '正確な最新のリリース規定はOGQクリエイタースタジオの公式案内をご確認ください。このチェックリストは参考用です。', '准确的最新上架规定请以 OGQ 创作者工作室的官方说明为准,此清单仅供参考。'],
  reviewUploadTitle: ['또는, 이미지 바로 업로드하기', 'Or upload images directly', 'または画像を直接アップロード', '或直接上传图片'],
  reviewUploadDesc: ['프로젝트 없이도 완성된 스티커 이미지만으로 OGQ 스펙을 바로 확인해요.', 'Check OGQ specs right away with a finished sticker image — no project required.', 'プロジェクトなしでも、完成したスタンプ画像だけでOGQの規格をすぐ確認できます。', '不需要项目,用完成的表情图片就能马上检查 OGQ 规格。'],
  reviewUploadDrop: ['이미지를 선택하거나 끌어다 놓으세요', 'Choose an image or drop it here', '画像を選ぶかドラッグ&ドロップしてください', '选择图片或拖放到此处'],
  reviewUploadHint: ['OGQ 공식 기준 · 메인 240×240 · 스티커 740×640 · 탭 96×74 · 각 1MB 이하 · PNG · 투명 배경', 'OGQ official specs · Main 240×240 · Sticker 740×640 · Tab 96×74 · 1MB or less each · PNG · transparent background', 'OGQ公式基準・メイン240×240・スタンプ740×640・タブ96×74・各1MB以下・PNG・透明背景', 'OGQ 官方标准 · 主图 240×240 · 表情 740×640 · 标签 96×74 · 每个 1MB 以内 · PNG · 透明背景'],
  reviewUploadSelectFile: ['이미지 선택', 'Choose image', '画像を選ぶ', '选择图片'],
  reviewUploadRemove: ['삭제', 'Remove', '削除', '删除'],
  reviewUploadDisclaimer: ['이 검사는 자동으로 규격만 확인하는 참고용이에요. 실제 OGQ 심사 결과와 다를 수 있어요.', 'This check only verifies specs automatically, for reference — actual OGQ review results may differ.', 'この検査は規格を自動で確認するだけの参考情報です。実際のOGQ審査結果とは異なる場合があります。', '此检查仅自动核对规格,仅供参考,实际 OGQ 审核结果可能不同。'],
  reviewProjectCheckTitle: ['선택한 프로젝트 OGQ 규격 검사', 'Selected project OGQ spec check', '選択したプロジェクトのOGQ規格検査', '已选项目 OGQ 规格检查'],
  reviewProjectCheckDesc: ['선택한 프로젝트의 이미지 {n}개를 자동으로 검사해요.', 'Automatically checking {n} images from the selected projects.', '選択したプロジェクトの画像{n}件を自動検査します。', '自动检查已选项目中的 {n} 张图片。'],
  reviewProjectCheckLoading: ['프로젝트 이미지를 검사하는 중...', 'Checking project images...', 'プロジェクト画像を検査中...', '正在检查项目图片...'],
  reviewProjectCheckFailed: ['프로젝트 이미지를 불러오지 못했어요. 선택을 해제한 뒤 다시 시도해주세요.', "Couldn't load the project images. Deselect the project and try again.", 'プロジェクト画像を読み込めませんでした。選択を解除して再試行してください。', '无法加载项目图片。请取消选择后重试。'],
  reviewCheckFormatLabel: ['파일 형식', 'File format', 'ファイル形式', '文件格式'],
  reviewCheckSizeLabel: ['용량', 'File size', '容量', '容量'],
  reviewCheckDimensionsLabel: ['크기 규격', 'Dimensions', 'サイズ規格', '尺寸规格'],
  reviewCheckTransparencyLabel: ['투명 배경', 'Transparent background', '透明背景', '透明背景'],
  reviewCheckMarginLabel: ['여백', 'Margin', '余白', '边距'],
  reviewCheckFormatPass: ['PNG 형식이에요.', "It's a PNG file.", 'PNG形式です。', '是 PNG 格式。'],
  reviewCheckFormatFail: ['{type} 형식이에요. 투명 배경을 지원하는 PNG로 저장해주세요.', "It's a {type} file. Save it as a PNG to support a transparent background.", '{type}形式です。透明背景に対応したPNGで保存してください。', '是 {type} 格式。请保存为支持透明背景的 PNG。'],
  reviewCheckSizePass: ['{size} — 1MB 이하예요.', '{size} — under 1MB.', '{size} — 1MB以下です。', '{size} — 未超过 1MB。'],
  reviewCheckSizeFail: ['{size} — 1MB를 넘었어요. 용량을 줄여주세요.', '{size} — over 1MB. Please reduce the file size.', '{size} — 1MBを超えています。容量を減らしてください。', '{size} — 超过了 1MB,请压缩文件大小。'],
  reviewCheckDimensionsPass: ['{w}×{h}px — {category} 규격에 맞아요.', '{w}×{h}px — matches the {category} spec.', '{w}×{h}px — {category}規格に合っています。', '{w}×{h}px — 符合{category}规格。'],
  reviewCheckDimensionsFail: ['{w}×{h}px — 메인 240×240, 스티커 740×640, 탭 96×74 중 어디에도 맞지 않아요.', "{w}×{h}px — doesn't match Main (240×240), Sticker (740×640), or Tab (96×74).", '{w}×{h}px — メイン240×240、スタンプ740×640、タブ96×74のどれにも合いません。', '{w}×{h}px — 不符合主图 240×240、表情 740×640、标签 96×74 中的任何一种。'],
  reviewCheckTransparencyPass: ['투명 배경이 확인됐어요.', 'Transparent background confirmed.', '透明背景を確認しました。', '已确认透明背景。'],
  reviewCheckTransparencyFail: ['배경이 투명하지 않아요. 알파 채널이 있는 PNG로 내보내주세요.', 'The background is not transparent. Export a PNG with an alpha channel.', '背景が透明ではありません。アルファチャンネル付きのPNGで書き出してください。', '背景不是透明的,请导出带 alpha 通道的 PNG。'],
  reviewCheckMarginPass: ['캐릭터 주변 여백이 충분해요.', 'There is enough margin around the character.', 'キャラクター周りの余白が十分です。', '角色周围留白充足。'],
  reviewCheckMarginWarn: ['캐릭터가 가장자리에 너무 붙어있어요. 여백을 좀 더 주세요.', 'The character is too close to the edge. Add more margin.', 'キャラクターが端に寄りすぎています。余白をもう少し取ってください。', '角色太靠近边缘了,请留出更多边距。'],
  reviewCheckMarginUnknown: ['투명 배경이 없어서 여백을 측정할 수 없어요.', "Margin can't be measured without a transparent background.", '透明背景がないため余白を測定できません。', '没有透明背景,无法测量边距。'],
  reviewCategoryMain: ['메인 이미지', 'Main image', 'メイン画像', '主图'],
  reviewCategorySticker: ['스티커 이미지', 'Sticker image', 'スタンプ画像', '表情图片'],
  reviewCategoryTab: ['탭 이미지', 'Tab image', 'タブ画像', '标签图片'],
  reviewCheckAllPass: ['모든 항목을 통과했어요!', 'Every check passed!', 'すべての項目に合格しました!', '所有检查项都通过了!'],
  reviewCheckIssues: ['{n}개 항목을 확인해주세요.', '{n} item(s) need a look.', '{n}件の項目を確認してください。', '有 {n} 项需要确认。'],
} satisfies Record<string, [string, string, string, string]>

/** reviewChecklistItems는 문자열 배열이라 위 4-tuple 패턴에 안 맞아 따로 둔다. */
const checklistItems: Record<SiteLang, string[]> = {
  ko: [
    '이미지는 투명 배경 PNG로 준비하세요 (기준 캔버스 740×640px, 파일당 1MB 이하)',
    '세트 안 이미지들이 동일한 캐릭터·화풍·색감을 유지하는지 확인하세요',
    '검색 노출을 위해 제목과 태그에 실제 감정·상황을 나타내는 키워드를 포함하세요',
    '저작권이 있는 캐릭터·폰트·이미지를 무단으로 사용하지 않았는지 확인하세요',
    '선정적이거나 폭력적인 표현이 없는지 확인하세요',
  ],
  en: [
    'Prepare transparent-background PNGs (reference canvas 740×640px, under 1MB per file)',
    'Keep the same character, art style, and color palette consistent across the set',
    'Include keywords that reflect the actual emotion or situation in your title and tags for discoverability',
    "Make sure you're not using copyrighted characters, fonts, or images without permission",
    'Check that there is no sexual or violent content',
  ],
  ja: [
    '透明背景のPNGで準備してください(基準キャンバス740×640px、ファイルごと1MB以下)',
    'セット内の画像が同じキャラクター・画風・色味を保っているか確認してください',
    '検索露出のためタイトルとタグに実際の感情・状況を表すキーワードを含めてください',
    '著作権のあるキャラクター・フォント・画像を無断使用していないか確認してください',
    '性的または暴力的な表現がないか確認してください',
  ],
  zh: [
    '准备透明背景的 PNG 图片(参考画布 740×640px,单张文件 1MB 以内)',
    '确认整套图片保持相同的角色、画风和配色',
    '为提高搜索曝光,在标题和标签中加入能体现真实情绪或场景的关键词',
    '确认没有未经授权使用有版权的角色、字体或图片',
    '确认没有色情或暴力内容',
  ],
}

export function reviewCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  const base = Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
  return { ...base, reviewChecklistItems: checklistItems[lang] }
}

export type ReviewCopy = ReturnType<typeof reviewCopy>
