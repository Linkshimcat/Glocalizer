import type { SiteLang } from './translations'

type Plan = { name: string; description: string; price: string; unit: string; features: string[]; cta: string; to: string }
type Copy = { title: string; intro: string; notice: string; recommended: string; pending: string; plans: Plan[]; helpTitle: string; helpText: string; helpLink: string; faqTitle: string; faqs: { q: string; a: string }[] }
export const pricingCopy: Record<SiteLang, Copy> = {
  ko: {
    title: '작가님의 시작부터,\n세계로 나가는 순간까지', intro: '필요한 만큼 선택하고, 창작에 집중하세요.',
    notice: '멤버십 출시 준비 중 · 아래 가격과 이용량은 예시이며, 아직 결제되지 않아요.', recommended: '작가님께 추천', pending: '예시 플랜 · 출시 준비 중',
    plans: [
      { name: '무료 체험', description: '처음이라면 가볍게 시작해요.', price: '₩0', unit: '체험용 · 예시', features: ['이모티콘 3장 현지화', '번역문 편집', 'PNG 다운로드'], cta: '워크스페이스에서 시작', to: '/dashboard' },
      { name: '크리에이터', description: '꾸준히 만드는 작가님을 위해.', price: '₩9,900', unit: '/ 월 · 예시', features: ['월 100장 현지화', '일본어 뜻풀이 · 발음 듣기', '편집 · PNG / ZIP 다운로드'], cta: '멤버십 문의하기', to: '/support' },
      { name: '스튜디오', description: '여러 작품을 함께 운영한다면.', price: '별도 문의', unit: '맞춤 상담', features: ['이용량에 맞춘 플랜 상담', '여러 작품의 현지화 운영 상담', '팀의 작업 방식에 맞춘 도입 상담'], cta: '도입 문의하기', to: '/support' },
    ],
    helpTitle: '어떤 플랜이 맞을지 고민되나요?', helpText: '예상 이용량과 작업 방식을 알려주세요. 함께 살펴볼게요.', helpLink: '고객 지원으로 문의', faqTitle: '자주 묻는 질문',
    faqs: [
      { q: '지금 멤버십을 결제할 수 있나요?', a: '멤버십은 아직 출시 준비 중입니다. 표시된 가격·이용량·구성은 예시이며 확정된 판매 조건이 아닙니다. 이 페이지에서는 결제나 구독 신청이 이루어지지 않습니다.' },
      { q: '현지화는 어떻게 시작하나요?', a: '워크스페이스에서 이모티콘 현지화를 선택하고 이미지를 업로드해보세요. 현재 이용 가능한 기능과 안내는 해당 작업 화면에서 확인할 수 있습니다.' },
      { q: '플랜은 나중에 변경할 수 있나요?', a: '플랜 변경·해지·환불 정책은 멤버십 출시 시 안내할 예정입니다. 현재는 유료 구독이 시작되지 않습니다.' },
      { q: '한 장의 이용량은 어떻게 계산하나요?', a: '여러 언어 선택과 재번역을 포함한 이용량 계산 기준은 출시 전에 확정하여 안내할 예정입니다.' },
    ],
  },
  en: {
    title: 'From your first creation\nto a worldwide audience', intro: 'Choose what you need. Focus on creating.', notice: 'Memberships are coming soon. Prices and limits below are examples; no payment is taken.', recommended: 'For regular creators', pending: 'Example plan · Coming soon',
    plans: [
      { name: 'Free trial', description: 'A simple place to begin.', price: '₩0', unit: 'Example trial', features: ['Localize 3 images', 'Edit translated captions', 'Download PNG files'], cta: 'Open workspace', to: '/dashboard' },
      { name: 'Creator', description: 'For creators who keep creating.', price: '₩9,900', unit: '/ month · Example', features: ['Localize 100 images per month', 'Japanese meaning and pronunciation', 'Editing and PNG / ZIP downloads'], cta: 'Ask about membership', to: '/support' },
      { name: 'Studio', description: 'For multiple projects and teams.', price: 'Contact us', unit: 'Tailored consultation', features: ['Discuss your expected usage', 'Plan localization for multiple projects', 'Discuss your team’s workflow'], cta: 'Contact us', to: '/support' },
    ], helpTitle: 'Not sure which plan fits?', helpText: 'Tell us about your workflow and expected usage.', helpLink: 'Contact support', faqTitle: 'Frequently asked questions',
    faqs: [{ q: 'Can I pay for a membership now?', a: 'Memberships are not available yet. Prices, limits and features are examples, not final terms. This page does not accept payment or start a subscription.' }, { q: 'How do I start localizing?', a: 'Open the workspace, choose localization and upload your images. See the workspace for currently available features and usage guidance.' }, { q: 'Can I change plans later?', a: 'Plan changes, cancellations and refund policies will be announced at launch. No paid subscription starts now.' }, { q: 'How is usage counted?', a: 'Rules for multiple languages and retranslations will be finalized and published before launch.' }],
  },
  ja: {
    title: 'はじめての作品から、\n世界へ届けるその日まで', intro: '必要な分だけ選んで、創作に集中しましょう。', notice: 'メンバーシップは準備中です。価格・利用量は例であり、決済は発生しません。', recommended: '継続して制作する方に', pending: 'プラン例 · 準備中',
    plans: [
      { name: '無料体験', description: 'まずは気軽に始めましょう。', price: '₩0', unit: '体験用の例', features: ['画像3枚のローカライズ', '翻訳文の編集', 'PNGダウンロード'], cta: 'ワークスペースで始める', to: '/dashboard' },
      { name: 'クリエイター', description: '日々制作する作家のために。', price: '₩9,900', unit: '/ 月 · 例', features: ['毎月100枚のローカライズ', '日本語の意味解説・読み上げ', '編集・PNG / ZIPダウンロード'], cta: 'メンバーシップについて相談', to: '/support' },
      { name: 'スタジオ', description: '複数作品を運用するチームに。', price: 'お問い合わせ', unit: '個別相談', features: ['利用量に合わせたプラン相談', '複数作品のローカライズ相談', 'チームの制作フローに合わせた相談'], cta: '導入について相談', to: '/support' },
    ], helpTitle: 'プラン選びに迷っていますか？', helpText: '利用量や制作フローをお聞かせください。', helpLink: 'サポートに相談', faqTitle: 'よくある質問',
    faqs: [{ q: '今すぐ購入できますか？', a: '現在準備中です。価格・利用量・機能は例であり、確定した販売条件ではありません。このページで決済や契約は行われません。' }, { q: 'どうやって始めますか？', a: 'ワークスペースでローカライズを選び、画像をアップロードしてください。現在利用できる機能は作業画面で確認できます。' }, { q: '後でプランを変更できますか？', a: '変更・解約・返金の条件は提供開始時にご案内します。現在、有料契約は開始されません。' }, { q: '利用量はどう数えますか？', a: '複数言語や再翻訳を含む計算方法は、提供開始前に確定してご案内します。' }],
  },
  zh: {
    title: '从第一份创作，\n到走向世界的那一刻', intro: '按需选择，专注创作。', notice: '会员服务筹备中。以下价格及用量仅为示例，不会产生付款。', recommended: '推荐给持续创作的作者', pending: '方案示例 · 筹备中',
    plans: [
      { name: '免费体验', description: '轻松迈出第一步。', price: '₩0', unit: '体验示例', features: ['本地化3张图片', '编辑翻译文案', '下载PNG文件'], cta: '进入工作空间', to: '/dashboard' },
      { name: '创作者', description: '为持续创作的作者准备。', price: '₩9,900', unit: '/ 月 · 示例', features: ['每月本地化100张图片', '日语释义与发音', '编辑与PNG / ZIP下载'], cta: '咨询会员方案', to: '/support' },
      { name: '工作室', description: '适合管理多个作品的团队。', price: '联系我们', unit: '定制咨询', features: ['按用量咨询方案', '多作品本地化咨询', '团队工作流程咨询'], cta: '咨询使用方案', to: '/support' },
    ], helpTitle: '不确定选哪个方案？', helpText: '告诉我们您的预计用量与创作方式。', helpLink: '联系客户支持', faqTitle: '常见问题',
    faqs: [{ q: '现在可以购买会员吗？', a: '会员服务尚在筹备中。价格、用量和功能仅为示例，并非最终销售条件。此页面不会收款或开通订阅。' }, { q: '如何开始本地化？', a: '进入工作空间，选择本地化并上传图片。当前可用功能及使用说明请查看操作页面。' }, { q: '以后可以更换方案吗？', a: '更换、取消与退款政策将在上线时公布。目前不会开通付费订阅。' }, { q: '如何计算用量？', a: '多语言及重新翻译的用量计算方式将在上线前确定并公布。' }],
  },
}
