import { CircleAlert } from 'lucide-react'
import { useSiteLang } from '../i18n/LanguageContext'
import type { SiteLang } from '../i18n/translations'

const notice: Record<SiteLang, { title: string; message: string }> = {
  ko: {
    title: '서비스 중단 안내',
    message: '운영 비용 문제로 2026년 11월 22일부터 백엔드 서비스를 중단합니다. 로그인, 이모티콘 생성·현지화, 저장된 자료 조회 등 서버가 필요한 기능을 이용할 수 없습니다. 필요한 자료는 중단 전에 내려받아 주세요.',
  },
  en: {
    title: 'Service suspension notice',
    message: 'Due to operating costs, backend services will be suspended from November 22, 2026. Sign-in, sticker generation and localization, access to saved data, and other server-dependent features will be unavailable. Please download any data you need before the suspension.',
  },
  ja: {
    title: 'サービス停止のお知らせ',
    message: '運営費用の問題により、2026年11月22日からバックエンドサービスを停止します。ログイン、スタンプの生成・ローカライズ、保存済みデータの閲覧など、サーバーを必要とする機能は利用できなくなります。必要なデータは停止前にダウンロードしてください。',
  },
  zh: {
    title: '服务暂停通知',
    message: '由于运营成本问题，后端服务将从2026年11月22日起停止。登录、表情生成与本地化、查看已保存的数据等依赖服务器的功能将无法使用。请在服务停止前下载所需数据。',
  },
}

export default function ServiceSuspensionNotice() {
  const { lang } = useSiteLang()
  const { title, message } = notice[lang]

  return (
    <div className="service-suspension-notice" role="status">
      <CircleAlert aria-hidden="true" size={16} />
      <p><strong>{title}</strong><span aria-hidden="true"> · </span>{message}</p>
    </div>
  )
}
