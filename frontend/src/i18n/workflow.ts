import type { SiteLang } from './translations'

const ko = {
  checkingSession: '로그인 상태를 확인하고 있어요', sessionRetry: '로그인 상태를 확인하지 못했어요. 다시 시도해주세요.', retry: '다시 시도',
  preview: '다운로드 미리보기', previewHint: '실제 PNG와 같은 결과입니다. 눌러서 크게 확인하세요.', previewFailed: '미리보기를 만들지 못했어요.', preparing: '파일을 준비하고 있어요…',
  ready: '파일이 준비됐어요', readyWithFailures: '{n}개는 처리에 실패했어요', downloadStarted: '다운로드를 시작했어요', downloadHint: '브라우저의 다운로드 목록에서 파일을 확인해주세요.', downloadAgain: '다시 다운로드',
  previewHintManual: '{n}개 이미지는 원래 글자가 남아있을 수 있어요. 노란 안내가 붙은 항목을 확인해주세요.',
  cleanup: '원래 글자가 남아 있는지 확인해주세요', cleanupHint: '자동 정리가 어려운 이미지입니다. 원본과 결과를 비교하고 필요한 부분을 직접 지울 수 있어요.', cleanupAction: '원래 글자 보정하기',
  applyAll: '모든 프레임에 같은 문구 적용', applyHint: '현재 언어의 대표 글자 영역에만 적용합니다. 위치와 글꼴은 유지됩니다. 인식 영역이 없는 프레임은 먼저 글자 영역을 추가해주세요.', applied: '{n}개 프레임에 문구를 적용했어요', undoAll: '일괄 적용 되돌리기', undone: '일괄 적용을 되돌렸어요',
  listen: '일본어 발음 듣기', stop: '듣기 정지', noVoice: '이 기기에 일본어 음성이 없어 발음을 들을 수 없어요.', speechFailed: '음성을 재생하지 못했어요. 다시 시도해주세요.',
  close: '닫기', previous: '이전', next: '다음', batchRecovered: '서버에서 생성 중인 작업을 확인했어요.', planRetry: '대표 캐릭터는 확정됐어요. 아래에서 표정·문구 계획을 다시 만들어주세요.',
}
type Copy = { [K in keyof typeof ko]: string }
export const workflowCopy: Record<SiteLang, Copy> = {
  ko,
  en: {
    checkingSession: 'Checking your session', sessionRetry: 'Could not check your session. Please retry.', retry: 'Retry',
    preview: 'Download preview', previewHint: 'This matches the exported PNG. Select it to enlarge.', previewFailed: 'Could not create the preview.', preparing: 'Preparing your files…',
    ready: 'Your files are ready', readyWithFailures: '{n} failed to process', downloadStarted: 'Download started', downloadHint: 'Check your browser’s download list for the file.', downloadAgain: 'Download again',
    previewHintManual: '{n} image(s) may still show original text. Check the items marked in amber below.',
    cleanup: 'Check for remaining original text', cleanupHint: 'This image needs manual cleanup. Compare the original and result, then erase any remaining text.', cleanupAction: 'Fix remaining text',
    applyAll: 'Apply this text to every frame', applyHint: 'Only the primary text region in this language is changed. Position and font are kept. Add a text region first for frames without one.', applied: 'Text applied to {n} frames', undoAll: 'Undo text application', undone: 'Text application undone',
    listen: 'Listen in Japanese', stop: 'Stop listening', noVoice: 'No Japanese voice is available on this device.', speechFailed: 'Could not play the voice. Please retry.',
    close: 'Close', previous: 'Previous', next: 'Next', batchRecovered: 'The server is already processing your images.', planRetry: 'Your character is confirmed. Retry creating the expression and caption plan below.',
  },
  ja: {
    checkingSession: 'ログイン状態を確認中', sessionRetry: 'ログイン状態を確認できませんでした。再試行してください。', retry: '再試行',
    preview: 'ダウンロードプレビュー', previewHint: '書き出すPNGと同じ結果です。押すと拡大できます。', previewFailed: 'プレビューを作成できませんでした。', preparing: 'ファイルを準備中…',
    ready: 'ファイルの準備ができました', readyWithFailures: '{n}件の処理に失敗しました', downloadStarted: 'ダウンロードを開始しました', downloadHint: 'ブラウザのダウンロード一覧をご確認ください。', downloadAgain: 'もう一度ダウンロード',
    previewHintManual: '{n}枚の画像に元の文字が残っている可能性があります。黄色い案内の付いた項目をご確認ください。',
    cleanup: '元の文字が残っていないか確認してください', cleanupHint: '手動での修正が必要です。元画像と結果を比較し、残った文字を消せます。', cleanupAction: '残った文字を修正',
    applyAll: '全フレームに同じ文句を適用', applyHint: 'この言語の代表文字領域だけに適用します。位置とフォントは維持します。領域のないフレームは先に文字領域を追加してください。', applied: '{n}フレームに適用しました', undoAll: '一括適用を元に戻す', undone: '一括適用を元に戻しました',
    listen: '日本語の発音を聞く', stop: '再生を停止', noVoice: 'この端末には日本語音声がありません。', speechFailed: '音声を再生できませんでした。再試行してください。',
    close: '閉じる', previous: '前へ', next: '次へ', batchRecovered: 'サーバーで画像を生成中です。', planRetry: 'キャラクターは確定済みです。下で表情・文句の計画作成を再試行してください。',
  },
  zh: {
    checkingSession: '正在确认登录状态', sessionRetry: '无法确认登录状态，请重试。', retry: '重试',
    preview: '下载预览', previewHint: '与导出的PNG一致，点击可放大。', previewFailed: '无法生成预览。', preparing: '正在准备文件…',
    ready: '文件已准备好', readyWithFailures: '{n}个处理失败', downloadStarted: '已开始下载', downloadHint: '请在浏览器下载列表中查看文件。', downloadAgain: '重新下载',
    previewHintManual: '{n}张图片可能仍残留原文字，请查看下方带黄色提示的项目。',
    cleanup: '请检查是否还有原来的文字', cleanupHint: '此图片需要手动修正。对比原图和结果后，可清除残留文字。', cleanupAction: '修正残留文字',
    applyAll: '将相同文案应用到所有帧', applyHint: '只更改当前语言的主要文字区域，保留位置和字体。没有文字区域的帧请先添加区域。', applied: '已应用到{n}帧', undoAll: '撤销批量应用', undone: '已撤销批量应用',
    listen: '听日语发音', stop: '停止播放', noVoice: '此设备没有日语语音。', speechFailed: '无法播放语音，请重试。',
    close: '关闭', previous: '上一张', next: '下一张', batchRecovered: '服务器正在生成图片。', planRetry: '角色已确认，请在下方重新生成表情和文案计划。',
  },
}
