import type { CreatorFeedbackId } from '../data/creatorFeedback'
import type { SiteLang } from './translations'

interface CreatorVoicesDict {
  title: string
  description: string
  role: string
  changeLabel: string
  /** 날짜 한 줄 (예: 2026.10.28 피드백) */
  dateLabel: (date: string) => string
  listLabel: string
  previousLabel: string
  nextLabel: string
  note: string
  cards: Record<CreatorFeedbackId, { quote: string; change: string }>
}

// quote는 작가님이 남긴 말(한국어 원문 기준, 다른 언어는 번역), change는 그에 맞춰 실제로 고친 내용이다.
// 아직 고치지 못한 의견은 카드에 넣지 않고 note에서 계속 개선 중이라고만 밝힌다.
export const creatorVoices: Record<SiteLang, CreatorVoicesDict> = {
  ko: {
    title: '작가님들의 피드백, 그리고 바뀐 것',
    description: '이모티콘 작가님 세 분이 직접 써 보고 남긴 의견과, 그에 맞춰 고친 내용입니다.',
    role: '이모티콘 작가',
    changeLabel: '이렇게 고쳤어요',
    dateLabel: date => `${date} 피드백`,
    listLabel: '작가님 피드백 카드 목록 (좌우로 넘겨 보기)',
    previousLabel: '이전 피드백 보기',
    nextLabel: '다음 피드백 보기',
    note: '아직 반영하지 못한 의견은 계속 개선하고 있습니다.',
    cards: {
      'jp-reading': {
        quote: '일본어 한자를 읽기 어려워 번역 표현을 판단할 때 활용할 수 있는 발음 듣기를 요청합니다.',
        change: '일본어 번역문이 실제로 어떤 뜻인지 한 문장으로 설명해 주는 뜻풀이를 추가했어요.',
      },
      'align-clip': {
        quote: '텍스트를 좌/우로 배치할 때, 글자가 잘린 상태로 배치되는 경우가 있었습니다.',
        change: '정렬(좌·중앙·우)에 맞춰 글자 기준점을 바꿔서, 에디터 미리보기와 PNG 다운로드 모두 캔버스 밖으로 잘리지 않아요.',
      },
      outline: {
        quote: '외곽선 처리 개선 필요. 굵기가 두꺼워질수록 글자가 가려지는 현상… 일본어와 중국어의 경우 외곽선이 텍스트를 가로질러 형성',
        change: 'PNG 다운로드에서 외곽선이 미리보기보다 2배 두껍게 그려지던 문제를 고치고, 미리보기도 외곽선이 글자를 덮지 않도록 PNG와 맞췄어요.',
      },
      'cjk-fonts': {
        quote: '다만 일본어와 중국어 전용 폰트는 없어서 아쉬웠습니다… 폰트마다 스타일 차이가 크지 않아 다양한 분위기를 표현하기는 어려웠습니다.',
        change: '일본어 3종·중국어(간체) 3종 폰트를 추가하고, 일본어와 중국어도 영어·한글처럼 AI가 원본과 가장 비슷한 폰트를 골라 주도록 바꿨어요.',
      },
      'culture-risk': {
        quote: '현지 정서나 유행에 안 맞거나 무례하게 읽히는 표현인지 판단하기 어렵다.',
        change: '번역 후보가 문화적으로 위험해 보이면 알려 주고 대안 표현을 제안하는 문화·정책 위험 확인(Culture & Policy Risk Guard)을 갖췄어요.',
      },
      'region-delete': {
        quote: '텍스트박스 항목이 중복으로 생성됐을 때, 삭제 버튼을 찾지 못해 어떻게 지워야 하는지 알기 어려웠습니다.',
        change: '감지된 문구 목록에 삭제 버튼을 추가해서, 중복으로 잡힌 텍스트박스를 바로 지울 수 있어요.',
      },
      'copy-text': {
        quote: '번역된 이미지가 폰트로 적용된다면 그대로 활용하기는 어렵다… 제작 단계에서 문구를 번역하고 검토한 뒤 직접 그려 넣는 편이 더 편리하다.',
        change: '번역 탭에 “번역 텍스트 복사” 버튼을 추가해서, 검토한 번역문을 한 번에 복사해 직접 옮겨 쓸 수 있어요.',
      },
    },
  },
  en: {
    title: 'What artists told us, and what changed',
    description: 'Feedback from three sticker artists who tried Glocalizer, and what we changed in response.',
    role: 'Sticker artist',
    changeLabel: 'What we changed',
    dateLabel: date => `Feedback · ${date}`,
    listLabel: 'Artist feedback cards (scroll sideways)',
    previousLabel: 'Previous feedback',
    nextLabel: 'Next feedback',
    note: 'Quotes are translated from Korean. Feedback we have not been able to address yet is still being worked on.',
    cards: {
      'jp-reading': {
        quote: 'Japanese kanji are hard for me to read. To judge a translation, I would like a way to hear how it is pronounced.',
        change: 'We added a plain-language meaning for Japanese translations: one sentence explaining what the translated text actually says.',
      },
      'align-clip': {
        quote: 'When I placed text on the left or right, it was sometimes cut off.',
        change: 'Text now anchors to the chosen alignment (left, center or right), so it is no longer cut off in the editor preview or in the downloaded PNG.',
      },
      outline: {
        quote: 'The outline needs work. The thicker it gets, the more it covers the letters… in Japanese and Chinese the outline runs across the text.',
        change: 'We fixed the downloaded PNG drawing outlines twice as thick as the preview, and made the preview match so the outline no longer covers the letters.',
      },
      'cjk-fonts': {
        quote: 'It was a pity there were no dedicated Japanese or Chinese fonts… the fonts did not differ much in style, so it was hard to express different moods.',
        change: 'We added three Japanese and three Simplified Chinese fonts, and AI now picks the closest font to the original lettering for those languages too, as it does for English and Korean.',
      },
      'culture-risk': {
        quote: 'It is hard to tell whether an expression does not fit local sentiment or trends, or could read as rude.',
        change: 'Our Culture & Policy Risk Guard flags translation candidates that look culturally risky and suggests alternatives.',
      },
      'region-delete': {
        quote: 'When a text box was created twice, I could not find a delete button and did not know how to remove it.',
        change: 'The detected-captions list now has a delete button, so you can remove a duplicate text box right away.',
      },
      'copy-text': {
        quote: 'If translated text is applied as a font, it is hard to use as it is… I find it easier to translate and review the text during production, then draw it in by hand.',
        change: 'The Translate tab now has a “Copy translated text” button that copies all reviewed captions at once so you can write them by hand.',
      },
    },
  },
  ja: {
    title: 'スタンプ作家さんの声と、改善したこと',
    description: 'Glocalizerを実際に使った3名のスタンプ作家さんの意見と、それを受けて改善した内容です。',
    role: 'スタンプ作家',
    changeLabel: '改善したこと',
    dateLabel: date => `${date} のご意見`,
    listLabel: 'スタンプ作家さんの声（左右にスクロール）',
    previousLabel: '前のフィードバック',
    nextLabel: '次のフィードバック',
    note: 'ご意見は韓国語から翻訳しています。まだ反映できていないご意見は、引き続き改善に取り組んでいます。',
    cards: {
      'jp-reading': {
        quote: '日本語の漢字が読みにくく、翻訳表現を判断するときに使える発音の再生機能をお願いしたいです。',
        change: '日本語の翻訳文が実際にどんな意味なのかを一文で説明する意味の解説を追加しました。',
      },
      'align-clip': {
        quote: 'テキストを左右に配置すると、文字が切れた状態で配置されることがありました。',
        change: '配置（左・中央・右）に合わせて文字の基準点を変え、エディターのプレビューでもPNGのダウンロードでも文字が切れないようにしました。',
      },
      outline: {
        quote: '縁取りの改善が必要です。太くするほど文字が隠れてしまい…日本語と中国語では縁取りが文字を横切るように形成されます。',
        change: 'ダウンロードしたPNGの縁取りがプレビューの2倍の太さで描かれていた問題を修正し、プレビューも縁取りが文字を覆わないようPNGに合わせました。',
      },
      'cjk-fonts': {
        quote: '日本語と中国語の専用フォントがなく残念でした…フォントごとのスタイルの差が小さく、さまざまな雰囲気を表現しにくかったです。',
        change: '日本語3種・中国語（簡体字）3種のフォントを追加し、日本語・中国語でも英語・韓国語と同じように、AIが元の文字に最も近いフォントを選ぶようにしました。',
      },
      'culture-risk': {
        quote: '現地の感覚や流行に合わない、または失礼に読まれる表現かどうかを判断しにくいです。',
        change: '翻訳候補が文化的に問題になりそうな場合に知らせ、代替表現を提案する文化・ポリシーリスクチェック（Culture & Policy Risk Guard）を備えています。',
      },
      'region-delete': {
        quote: 'テキストボックスが重複して作られたとき、削除ボタンが見つからず、どう消せばよいか分かりませんでした。',
        change: '検出した文言の一覧に削除ボタンを追加し、重複したテキストボックスをすぐに消せるようにしました。',
      },
      'copy-text': {
        quote: '翻訳した画像がフォントとして適用されても、そのまま使うのは難しいです…制作の段階で文言を翻訳して確認し、手で描き込むほうが便利です。',
        change: '翻訳タブに「翻訳テキストをコピー」ボタンを追加し、確認した翻訳文をまとめてコピーして手で書き写せるようにしました。',
      },
    },
  },
  zh: {
    title: '作者们的反馈与我们的改进',
    description: '三位表情包作者亲自试用后的意见，以及我们据此所做的改进。',
    role: '表情包作者',
    changeLabel: '我们的改进',
    dateLabel: date => `${date} 的反馈`,
    listLabel: '表情包作者的反馈（可左右滑动）',
    previousLabel: '上一条反馈',
    nextLabel: '下一条反馈',
    note: '引文由韩文翻译。尚未落实的意见，我们仍在持续改进。',
    cards: {
      'jp-reading': {
        quote: '日语汉字不太好读，希望能提供发音收听功能，方便判断翻译表达。',
        change: '新增日语释义，用一句话说明日语译文实际表达的意思。',
      },
      'align-clip': {
        quote: '把文字靠左或靠右排版时，有时文字会被截断。',
        change: '文字会按对齐方式（左、居中、右）调整基准点，编辑器预览和下载的 PNG 都不会再被截断。',
      },
      outline: {
        quote: '描边需要改进。描边越粗，文字越容易被遮住……日语和中文的描边还会穿过文字。',
        change: '修复了下载的 PNG 描边比预览粗一倍的问题，并让预览也与 PNG 一致，描边不再遮住文字。',
      },
      'cjk-fonts': {
        quote: '没有日语和中文专用字体，有些遗憾……字体之间的风格差异不大，很难表现不同的氛围。',
        change: '新增 3 款日语字体和 3 款简体中文字体，日语和中文也像英语、韩语一样，由 AI 选择与原图文字最接近的字体。',
      },
      'culture-risk': {
        quote: '很难判断某个表达是否不符合当地情感或流行，或者读起来是否失礼。',
        change: '当译文候选在文化上显得有风险时，文化与政策风险检查（Culture & Policy Risk Guard）会提醒并给出替代表达。',
      },
      'region-delete': {
        quote: '文本框重复生成时，我找不到删除按钮，不知道该怎么删除。',
        change: '在“检测到的文字”列表中新增了删除按钮，可直接删除重复的文本框。',
      },
      'copy-text': {
        quote: '如果译文以字体形式应用在图片上，很难直接使用……在制作阶段翻译并检查文字，再亲手画上去会更方便。',
        change: '翻译标签页新增“复制翻译文字”按钮，可一次复制已检查的全部译文，方便手写。',
      },
    },
  },
}
