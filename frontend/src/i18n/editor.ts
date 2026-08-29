import type { SiteLang } from './translations'

export interface EditorDict {
  aiEditor: string
  backToDash: string
  undo: string
  redo: string
  reset: string
  preview: string
  savePng: string
  settings: string
  save: string
  saving: string
  making: string
  downloadAllZip: string
  editingSuffix: string
  emojiLabel: string
  doneLabel: string
  countUnit: string
  statusDone: string
  statusEditing: string
  statusWait: string
  deleteEmoji: string
  prev: string
  next: string
  canvasOriginal: string
  canvasPreview: string
  original: string
  foundText: string
  notFoundText: string
  enterTextTitle: string
  originalSize: string
  hintManualBg: string
  hintComposite: string
  hintDrag: string
  tabTranslate: string
  tabFont: string
  tabStyle: string
  ocrEditTitle: string
  ocrNeedCheck: string
  ocrEditHint: string
  ocrResave: string
  detectedCaptions: string
  captionReview: string
  translationMissing: string
  translationNeeded: string
  retryTranslation: string
  retryingTranslation: string
  reselectArea: string
  addCaption: string
  selectionHint: string
  detectingArea: string
  detectedAreaTitle: string
  confirmArea: string
  cancelArea: string
  aiSuggest: string
  customHint: string
  customPlaceholder: string
  font: string
  fontAiRec: string
  apply: string
  recSuffix: string
  weight: string
  oneWeightOnly: string
  sizeRotation: string
  size: string
  rotation: string
  textColor: string
  pickColor: string
  textBg: string
  opacity: string
  padding: string
  corner: string
  stroke: string
  shadow: string
  blur: string
  horizontal: string
  vertical: string
  transparency: string
  align: string
  alignLeft: string
  alignCenter: string
  alignRight: string
  alignTop: string
  alignBottom: string
  imageSize: string
  background: string
  bgTransparent: string
  bgWhite: string
  eraseOriginal: string
  eraseHintManual: string
  eraseHintAuto: string
  eraseTransparent: string
  eraseSolid: string
  bgColor: string
  cornerRound: string
  posX: string
  posY: string
  sizeX: string
  sizeY: string
  exportTitle: string
  aiLocalizationApplied: string
  download: string
}

export const editorDict: Record<SiteLang, EditorDict> = {
  ko: {
    aiEditor: 'AI 에디터', backToDash: '대시보드로 돌아가기', undo: '실행 취소', redo: '다시 실행', reset: '초기화',
    preview: '미리보기', savePng: 'PNG 저장', settings: '설정', save: '저장', saving: '저장 중…', making: '만드는 중…',
    downloadAllZip: '전체 ZIP 다운로드', editingSuffix: '편집 중', emojiLabel: '이모티콘', doneLabel: '완료', countUnit: '장',
    statusDone: '✓ 완료', statusEditing: '편집 중', statusWait: '대기', deleteEmoji: '이모티콘 삭제', prev: '이전', next: '다음',
    canvasOriginal: '원본', canvasPreview: '변환 미리보기', original: '원본',
    foundText: '텍스트를 찾았어요', notFoundText: '텍스트를 찾지 못했어요', enterTextTitle: '직접 문구를 입력해보세요', originalSize: '원래 크기',
    hintManualBg: '복잡한 배경은 수동 보정이 필요할 수 있어요.', hintComposite: 'AI가 정리한 이미지 위에 번역을 합성해요.', hintDrag: '텍스트를 끌어서 옮기고, 모서리와 위 핸들로 다듬어보세요',
    tabTranslate: '번역', tabFont: '폰트', tabStyle: '스타일',
    ocrEditTitle: '인식 문구 수정', ocrNeedCheck: '· 확인 필요', ocrEditHint: '문구 또는 감지 영역을 확인한 뒤 저장하면 이 이미지 하나만 다시 번역·정리합니다.', ocrResave: '인식 문구 저장 후 재처리', detectedCaptions: '감지된 문구', captionReview: '검수 필요',
    translationMissing: '번역이 누락됐어요. 다시 시도하거나 직접 입력해주세요.', translationNeeded: '번역 필요', retryTranslation: '번역 다시 시도', retryingTranslation: '번역 중…', reselectArea: '영역 다시 지정', addCaption: '누락 문구 추가', selectionHint: '원본 이미지에서 문구 영역을 드래그해주세요.', detectingArea: '선택한 영역을 읽고 있어요…', detectedAreaTitle: '감지된 문구 확인', confirmArea: '확정 후 재처리', cancelArea: '취소',
    aiSuggest: 'AI 번역 추천', customHint: '마음에 드는 게 없다면 직접 써보세요', customPlaceholder: '원하는 문구를 직접 입력해보세요',
    font: '폰트', fontAiRec: '원본 글씨체와 어울리는 AI 추천', apply: '적용', recSuffix: '✨ 추천',
    weight: '굵기', oneWeightOnly: '이 폰트는 한 가지 굵기만 지원해요.', sizeRotation: '크기 · 회전', size: '크기', rotation: '회전',
    textColor: '글자 색', pickColor: '원하는 색 직접 고르기', textBg: '글자 배경', opacity: '불투명도', padding: '여백', corner: '모서리',
    stroke: '테두리', shadow: '그림자', blur: '흐림', horizontal: '가로', vertical: '세로', transparency: '투명도',
    align: '정렬', alignLeft: '좌', alignCenter: '가운데', alignRight: '우', alignTop: '상', alignBottom: '하',
    imageSize: '원본 이미지 크기', background: '배경', bgTransparent: '투명', bgWhite: '화이트',
    eraseOriginal: '원문 지우기', eraseHintManual: '자동 정리가 어려운 배경이에요. 지울 영역을 직접 보정해주세요.', eraseHintAuto: '자동 정리 결과가 어색할 때만 직접 보정해주세요.',
    eraseTransparent: '투명 처리', eraseSolid: '배경색 채우기', bgColor: '배경색', cornerRound: '모서리 둥글기',
    posX: '가로 위치', posY: '세로 위치', sizeX: '가로 크기', sizeY: '세로 크기', exportTitle: '내보내기', aiLocalizationApplied: 'AI 로컬라이징이 적용됐어요.', download: '다운로드',
  },
  en: {
    aiEditor: 'AI Editor', backToDash: 'Back to dashboard', undo: 'Undo', redo: 'Redo', reset: 'Reset',
    preview: 'Preview', savePng: 'Save PNG', settings: 'Settings', save: 'Save', saving: 'Saving…', making: 'Working…',
    downloadAllZip: 'Download all (ZIP)', editingSuffix: 'editing', emojiLabel: 'Emojis', doneLabel: 'Done', countUnit: '',
    statusDone: '✓ Done', statusEditing: 'Editing', statusWait: 'Waiting', deleteEmoji: 'Delete emoji', prev: 'Prev', next: 'Next',
    canvasOriginal: 'Original', canvasPreview: 'Preview', original: 'Original',
    foundText: 'Text found', notFoundText: 'No text found', enterTextTitle: 'Type your own text', originalSize: 'Actual size',
    hintManualBg: 'Complex backgrounds may need manual touch-up.', hintComposite: 'Translation is composited on the cleaned image.', hintDrag: 'Drag the text to move it; use the corner and top handles to adjust.',
    tabTranslate: 'Translate', tabFont: 'Font', tabStyle: 'Style',
    ocrEditTitle: 'Edit detected text', ocrNeedCheck: '· needs review', ocrEditHint: 'Check the text or detected area, then save to re-run just this image.', ocrResave: 'Save & reprocess', detectedCaptions: 'Detected captions', captionReview: 'Review',
    translationMissing: 'Translation is missing. Retry or enter it yourself.', translationNeeded: 'Needs translation', retryTranslation: 'Retry translation', retryingTranslation: 'Translating…', reselectArea: 'Redraw area', addCaption: 'Add missing text', selectionHint: 'Drag over the caption on the original image.', detectingArea: 'Reading the selected area…', detectedAreaTitle: 'Check detected text', confirmArea: 'Confirm & reprocess', cancelArea: 'Cancel',
    aiSuggest: 'AI suggestions', customHint: 'Not a fan? Write your own', customPlaceholder: 'Type the text you want',
    font: 'Font', fontAiRec: 'AI pick matching the original', apply: 'Apply', recSuffix: '✨ pick',
    weight: 'Weight', oneWeightOnly: 'This font supports only one weight.', sizeRotation: 'Size · Rotation', size: 'Size', rotation: 'Rotation',
    textColor: 'Text color', pickColor: 'Pick a custom color', textBg: 'Text background', opacity: 'Opacity', padding: 'Padding', corner: 'Corner',
    stroke: 'Stroke', shadow: 'Shadow', blur: 'Blur', horizontal: 'X', vertical: 'Y', transparency: 'Transparency',
    align: 'Align', alignLeft: 'L', alignCenter: 'C', alignRight: 'R', alignTop: 'T', alignBottom: 'B',
    imageSize: 'Original image size', background: 'Background', bgTransparent: 'Transparent', bgWhite: 'White',
    eraseOriginal: 'Erase original', eraseHintManual: 'This background is hard to auto-clean. Please adjust the erase area.', eraseHintAuto: 'Only touch up if the auto result looks off.',
    eraseTransparent: 'Transparent', eraseSolid: 'Fill with color', bgColor: 'Fill color', cornerRound: 'Corner radius',
    posX: 'X position', posY: 'Y position', sizeX: 'Width', sizeY: 'Height', exportTitle: 'Export', aiLocalizationApplied: 'AI localization has been applied.', download: 'Download',
  },
  ja: {
    aiEditor: 'AIエディター', backToDash: 'ダッシュボードに戻る', undo: '元に戻す', redo: 'やり直し', reset: 'リセット',
    preview: 'プレビュー', savePng: 'PNG保存', settings: '設定', save: '保存', saving: '保存中…', making: '作成中…',
    downloadAllZip: '一括ZIPダウンロード', editingSuffix: '編集中', emojiLabel: '絵文字', doneLabel: '完了', countUnit: '枚',
    statusDone: '✓ 完了', statusEditing: '編集中', statusWait: '待機', deleteEmoji: '絵文字を削除', prev: '前へ', next: '次へ',
    canvasOriginal: '原本', canvasPreview: '変換プレビュー', original: '原本',
    foundText: 'テキストを検出しました', notFoundText: 'テキストが見つかりません', enterTextTitle: '文言を直接入力できます', originalSize: '元のサイズ',
    hintManualBg: '複雑な背景は手動調整が必要な場合があります。', hintComposite: 'AIが整理した画像に翻訳を合成します。', hintDrag: 'テキストをドラッグして移動し、角と上のハンドルで調整してください。',
    tabTranslate: '翻訳', tabFont: 'フォント', tabStyle: 'スタイル',
    ocrEditTitle: '認識文言の修正', ocrNeedCheck: '· 要確認', ocrEditHint: '文言または検出領域を確認して保存すると、この画像だけ再翻訳・整理します。', ocrResave: '文言を保存して再処理', detectedCaptions: '検出した文言', captionReview: '要確認',
    translationMissing: '翻訳がありません。再試行するか直接入力してください。', translationNeeded: '翻訳が必要', retryTranslation: '翻訳を再試行', retryingTranslation: '翻訳中…', reselectArea: '範囲を再指定', addCaption: '見落とした文言を追加', selectionHint: '原本画像上で文言の範囲をドラッグしてください。', detectingArea: '選択範囲を読み取っています…', detectedAreaTitle: '検出文言を確認', confirmArea: '確定して再処理', cancelArea: 'キャンセル',
    aiSuggest: 'AI翻訳のおすすめ', customHint: '気に入らなければ直接入力', customPlaceholder: '入力したい文言を書いてください',
    font: 'フォント', fontAiRec: '原本の書体に合うAIおすすめ', apply: '適用', recSuffix: '✨ おすすめ',
    weight: '太さ', oneWeightOnly: 'このフォントは1種類の太さのみ対応です。', sizeRotation: 'サイズ · 回転', size: 'サイズ', rotation: '回転',
    textColor: '文字色', pickColor: '好きな色を選ぶ', textBg: '文字背景', opacity: '不透明度', padding: '余白', corner: '角',
    stroke: '縁取り', shadow: '影', blur: 'ぼかし', horizontal: '横', vertical: '縦', transparency: '透明度',
    align: '配置', alignLeft: '左', alignCenter: '中央', alignRight: '右', alignTop: '上', alignBottom: '下',
    imageSize: '元画像のサイズ', background: '背景', bgTransparent: '透明', bgWhite: '白',
    eraseOriginal: '原文消去', eraseHintManual: '自動整理が難しい背景です。消す領域を直接調整してください。', eraseHintAuto: '自動整理の結果が不自然なときだけ調整してください。',
    eraseTransparent: '透明処理', eraseSolid: '背景色で塗る', bgColor: '背景色', cornerRound: '角の丸み',
    posX: '横位置', posY: '縦位置', sizeX: '横サイズ', sizeY: '縦サイズ', exportTitle: '書き出し', aiLocalizationApplied: 'AIローカライズを適用しました。', download: 'ダウンロード',
  },
  zh: {
    aiEditor: 'AI 编辑器', backToDash: '返回仪表板', undo: '撤销', redo: '重做', reset: '重置',
    preview: '预览', savePng: '保存 PNG', settings: '设置', save: '保存', saving: '保存中…', making: '生成中…',
    downloadAllZip: '打包 ZIP 下载', editingSuffix: '编辑中', emojiLabel: '表情包', doneLabel: '完成', countUnit: '张',
    statusDone: '✓ 完成', statusEditing: '编辑中', statusWait: '等待', deleteEmoji: '删除表情包', prev: '上一张', next: '下一张',
    canvasOriginal: '原图', canvasPreview: '转换预览', original: '原图',
    foundText: '已找到文字', notFoundText: '未找到文字', enterTextTitle: '直接输入文字', originalSize: '原始大小',
    hintManualBg: '复杂背景可能需要手动修整。', hintComposite: '在 AI 整理后的图片上合成翻译。', hintDrag: '拖动文字移动，用四角和顶部手柄调整。',
    tabTranslate: '翻译', tabFont: '字体', tabStyle: '样式',
    ocrEditTitle: '修改识别文字', ocrNeedCheck: '· 需确认', ocrEditHint: '确认文字或检测区域后保存，将只对这张图片重新翻译整理。', ocrResave: '保存并重新处理', detectedCaptions: '检测到的文字', captionReview: '需确认',
    translationMissing: '翻译缺失，请重试或直接输入。', translationNeeded: '需要翻译', retryTranslation: '重试翻译', retryingTranslation: '翻译中…', reselectArea: '重新框选', addCaption: '添加遗漏文字', selectionHint: '请在原图上拖动框选文字区域。', detectingArea: '正在识别所选区域…', detectedAreaTitle: '确认识别文字', confirmArea: '确认并重新处理', cancelArea: '取消',
    aiSuggest: 'AI 翻译推荐', customHint: '不满意就自己输入', customPlaceholder: '输入你想要的文字',
    font: '字体', fontAiRec: '与原字体相配的 AI 推荐', apply: '应用', recSuffix: '✨ 推荐',
    weight: '粗细', oneWeightOnly: '该字体仅支持一种粗细。', sizeRotation: '大小 · 旋转', size: '大小', rotation: '旋转',
    textColor: '文字颜色', pickColor: '自选颜色', textBg: '文字背景', opacity: '不透明度', padding: '内边距', corner: '圆角',
    stroke: '描边', shadow: '阴影', blur: '模糊', horizontal: '横', vertical: '纵', transparency: '透明度',
    align: '对齐', alignLeft: '左', alignCenter: '居中', alignRight: '右', alignTop: '上', alignBottom: '下',
    imageSize: '原图大小', background: '背景', bgTransparent: '透明', bgWhite: '白色',
    eraseOriginal: '擦除原文', eraseHintManual: '此背景难以自动清理，请手动调整擦除区域。', eraseHintAuto: '仅当自动清理效果不佳时再手动调整。',
    eraseTransparent: '透明处理', eraseSolid: '填充背景色', bgColor: '背景色', cornerRound: '圆角程度',
    posX: '横向位置', posY: '纵向位置', sizeX: '横向大小', sizeY: '纵向大小', exportTitle: '导出', aiLocalizationApplied: '已应用 AI 本地化。', download: '下载',
  },
}
