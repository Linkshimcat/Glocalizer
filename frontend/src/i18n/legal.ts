import type { SiteLang } from './translations'

export interface LegalSection { title: string; paragraphs: string[] }
export interface LegalCopy { title: string; description: string; sections: LegalSection[] }
interface LegalLocale {
  privacy: LegalCopy; terms: LegalCopy
}

export const LEGAL_EFFECTIVE_DATE = '2026-09-24'
export const LEGAL_CONTACT = 'veyrix0816@gmail.com'

export const legalDict: Record<SiteLang, LegalLocale> = {
  ko: {
    privacy: {
      title: '개인정보처리방침',
      description: 'Glocalizer Team은 계정 관리와 이모티콘 생성·현지화·출시 검토에 필요한 정보를 처리합니다. 이 방침은 수집 항목, 이용 목적, 보관과 삭제 방법을 안내합니다.',
      sections: [
        { title: '수집 항목과 수집 방법', paragraphs: [
          '이메일 가입 시 이메일 주소, 단방향 암호화된 비밀번호와 선택 입력한 닉네임을 저장합니다. Google·Naver 로그인 시 제공자가 전달하는 계정 식별자, 이메일, 이름과 프로필 이미지를 처리합니다. 프로필에서 직접 변경한 닉네임과 이미지도 저장합니다.',
          '파일 업로드와 기능 실행 시 원본·참고 이미지, OCR 인식 문구와 좌표, 번역 후보, 편집 내용, 캐릭터 설명과 생성 요청, 생성 이미지·문구, 프로젝트 상태 및 생성·다운로드 기록을 처리합니다. 출시 심층 검토에는 선택한 프로젝트의 이미지와 문구가 사용됩니다.',
          '접속 시각, 요청·오류 기록, IP 주소 등 운영·보안 정보가 자동으로 생성될 수 있습니다. 피드백 제출 시 메시지와 계정 이름·이메일 또는 계정 식별자를 처리합니다.'
        ] },
        { title: '처리 목적', paragraphs: ['회원 식별과 로그인 유지, 프로필 관리, 이미지 인식·번역·편집·생성, 결과 저장과 다운로드, 프로젝트 복원, 출시 검토를 위해 정보를 이용합니다. 오류 대응, 부정 이용 방지, 보안·품질 개선, 피드백 처리와 계정 탈퇴에도 필요한 정보를 이용합니다.'] },
        { title: '보유 기간과 삭제', paragraphs: [
          '회원 정보와 회원 프로젝트는 계정 탈퇴 또는 해당 데이터 삭제 시까지 보관합니다. 만료되는 비회원 프로젝트는 프로젝트에 표시된 만료 시각을 기준으로 정리합니다. 서버 기본 만료 기간은 생성 후 24시간이며 운영 설정에 따라 달라질 수 있습니다.',
          '이메일·Naver 로그인 토큰의 유효기간은 발급 후 최대 30일입니다. 로그아웃하면 이 브라우저에 저장된 로그인 정보가 제거됩니다. Google 로그인 세션은 인증 제공자의 세션 정책도 적용됩니다.',
          '서비스 로그는 보안·장애 대응에 필요한 최소 기간 보관합니다. 법령상 보존 의무가 있는 정보는 해당 기간 동안 분리 보관합니다. 계정 탈퇴 시 프로젝트·이미지·프로필과 연결된 인증 정보를 순차적으로 삭제하며, 삭제된 데이터는 복구할 수 없습니다.',
          '공개 GitHub 피드백은 계정 탈퇴만으로 자동 삭제되지 않습니다. 삭제가 필요하면 이슈 주소와 함께 아래 연락처로 요청해 주세요.'
        ] },
        { title: '브라우저 저장 정보', paragraphs: ['로그인 토큰·계정 정보·선택한 사이트 언어는 브라우저의 로컬 저장소에, 작업 상태는 세션 저장소에 저장됩니다. 브라우저 설정에서 사이트 데이터를 삭제할 수 있으나 로그인과 작업 복원이 해제될 수 있습니다. 공용 기기에서는 작업 후 로그아웃하세요.'] },
        { title: '외부 서비스와 데이터 전달', paragraphs: [
          'Supabase는 데이터베이스·파일 저장소와 Google 인증에, Vercel·Render는 웹사이트·서버 호스팅에 사용됩니다. Google·Naver는 선택한 소셜 로그인에 사용됩니다.',
          '활성화된 기능과 서버 설정에 따라 OpenAI·Groq·Google Gemini에 이미지 또는 필요한 이미지 영역, 인식 문구, 번역 대상 언어, 생성 요청, 검토용 프로젝트 내용이 전달될 수 있습니다. 목적은 OCR, 번역, 이미지 생성, 문구·글꼴 분석과 출시 검토입니다.',
          '외부 서비스의 처리 위치와 보유 정책은 제공자 및 운영 설정에 따라 달라지며 국외에서 처리될 수 있습니다. 관련 처리 정보는 아래 연락처로 문의할 수 있습니다. Glocalizer는 업로드 이미지를 자체 AI 모델 학습 데이터로 사용하지 않으며 외부 제공자의 처리는 해당 제공자의 정책을 따릅니다.',
          '피드백 제출 시 GitHub에 메시지와 계정 이름·이메일 또는 계정 식별자를 포함한 공개 이슈가 생성될 수 있습니다. 비밀번호나 개인 연락처 등 공개를 원하지 않는 정보는 입력하지 마세요.'
        ] },
        { title: '권리와 행사 방법', paragraphs: ['설정 화면에서 계정 정보를 확인·수정하고 탈퇴할 수 있습니다. 열람, 정정, 삭제 또는 처리 정지 요청은 아래 이메일로 보내주세요. 요청 대상과 계정을 확인할 수 있는 정보를 알려주시면 본인 확인 후 처리합니다. 비밀번호는 보내지 마세요. 법령상 제한으로 요청을 처리할 수 없는 경우 그 이유를 안내합니다.'] },
        { title: '안전성 확보 조치', paragraphs: ['비밀번호 단방향 암호화, 비공개 파일 저장소와 만료되는 서명 URL, 인증·권한 확인, 요청 횟수 제한, 서버 비밀키 분리 등으로 정보를 보호합니다. 목적이 달성되거나 보유 기간이 끝난 정보는 복구하기 어려운 방법으로 삭제합니다.'] },
        { title: '문의와 방침 변경', paragraphs: ['개인정보 보호 담당은 Glocalizer Team이며 아래 이메일로 문의할 수 있습니다. 법령·서비스·처리 방식의 변경으로 방침이 수정되면 시행일과 주요 변경 내용을 서비스 화면에서 안내합니다.'] },
      ],
    },
    terms: {
      title: '서비스 이용약관', description: '이 약관은 Glocalizer의 이모티콘 생성·현지화·출시 검토 서비스 이용 조건과 이용자 및 운영팀의 권리·책임을 정합니다.',
      sections: [
        { title: '목적과 적용', paragraphs: ['이 약관은 Glocalizer 웹 서비스와 부수 기능에 적용됩니다. 회원가입과 서비스 이용 전에 이 약관과 개인정보처리방침을 확인해 주세요.'] },
        { title: '계정 관리', paragraphs: ['이용자는 정확한 정보를 입력하고 로그인 수단을 안전하게 관리해야 합니다. 계정 양도, 타인 계정의 무단 사용은 금지됩니다. 비정상적인 계정 활동을 발견하면 운영팀에 알려주세요. 생성, 프로젝트 저장 등 계정 기반 기능에는 로그인이 필요합니다.'] },
        { title: '제공 기능과 이용 범위', paragraphs: ['캐릭터 설명과 선택적 참고 이미지를 바탕으로 한 이모티콘 생성, 이미지 속 한국어 인식과 영어·일본어·중국어 현지화, 문구·이미지 편집, 결과 다운로드와 프로젝트 보관을 제공합니다. 출시 검토는 이미지 규격 확인, 관련 OGQ 콘텐츠 탐색과 AI 피드백을 보조합니다.', '제공 기능, 파일 수·용량, 생성·재생성 횟수와 처리 가능 범위는 화면 안내 및 운영 설정에 따라 제한될 수 있습니다. 외부 AI 서비스 상태에 따라 지연·실패할 수 있으며 처리 시간이나 결과 품질을 보장하지 않습니다. 중요한 기능·이용 조건 변경은 가능한 범위에서 사전에 안내합니다.'] },
        { title: '콘텐츠 권리와 처리 허용', paragraphs: ['업로드한 이미지·문구·참고 자료에 대한 권리는 이용자 또는 기존 권리자에게 유지됩니다. 이용자는 해당 자료를 처리할 권한이 있어야 하며 타인의 저작권·상표권·초상권·개인정보를 침해하는 자료를 올릴 수 없습니다.', '이용자는 요청한 기능 제공에 필요한 범위에서 콘텐츠의 저장·복제·변환과 외부 처리 서비스 전송을 허용합니다. 생성 결과의 권리 귀속이나 독점성은 보장되지 않으며, 사용·배포 전에 원본 자료의 이용 조건과 결과물의 권리 관계를 확인해야 합니다.'] },
        { title: 'AI 결과와 출시 검토', paragraphs: ['OCR·번역·이미지 정리·생성·AI 검토 결과에는 오류가 있을 수 있습니다. 원문, 이미지 훼손 여부, 번역의 자연스러움과 문구 배치를 직접 확인·수정하세요.', '규격 검사와 AI 피드백은 참고 자료이며 OGQ의 공식 심사, 저작권 판단 또는 출시 승인이 아닙니다. 다운로드는 자동 제출·출시를 의미하지 않습니다. 실제 제출 기준과 권리 확인은 이용자가 수행해야 합니다.'] },
        { title: '금지 행위', paragraphs: ['위법하거나 타인의 권리를 침해하는 콘텐츠의 업로드·생성·배포, 무단 접근, 보안 우회, 과도한 자동 요청, 악성코드 전송, 사기·사칭과 서비스 운영 방해를 금지합니다. 운영팀의 허가 없이 서비스 결과나 기능을 재판매할 수 없습니다.'] },
        { title: '이용 제한과 탈퇴', paragraphs: ['약관 위반, 보안 위험 또는 운영 방해가 확인되면 서비스 이용이 제한될 수 있습니다. 제한에 관한 문의는 아래 연락처로 할 수 있습니다.', '설정 화면에서 계정을 탈퇴할 수 있습니다. 탈퇴하면 저장된 프로젝트·이미지·프로필과 연결된 인증 정보가 삭제되며 복구할 수 없습니다. 필요한 결과는 미리 다운로드하세요. 공개 피드백의 삭제는 별도로 요청해야 합니다.'] },
        { title: '책임의 범위', paragraphs: ['운영팀은 안정적인 서비스 제공을 위해 노력합니다. 천재지변, 외부 서비스 장애, 이용자 귀책 등 합리적으로 통제하기 어려운 사유에 따른 중단은 책임이 제한될 수 있습니다. 관련 법령상 배제할 수 없는 책임은 제한하지 않습니다.'] },
        { title: '약관 변경과 분쟁 해결', paragraphs: ['약관 변경 시 시행일과 변경 내용을 서비스 화면에서 안내합니다. 이용자에게 불리한 중요한 변경은 합리적인 사전 안내 기간을 둡니다. 서비스 관련 분쟁에는 대한민국 법령을 적용하며 협의로 해결되지 않으면 관련 법령이 정한 법원을 관할 법원으로 합니다.'] },
        { title: '문의', paragraphs: ['서비스와 약관에 관한 문의는 아래 Glocalizer Team 이메일로 보내주세요.'] },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy Policy', description: 'Glocalizer Team processes information needed for accounts, sticker generation, localization and release reviews. This policy explains what we collect, why we use it, and how it is retained and deleted.',
      sections: [
        { title: 'Information collected and how', paragraphs: ['Email registration stores your email address, a one-way password hash and an optional nickname. Google or Naver sign-in provides an account identifier, email, name and profile image. We also store profile names and images you update.', 'Uploads and feature requests involve original and reference images, recognized text and coordinates, translation candidates, edits, character descriptions and generation prompts, generated images and captions, project status, and generation and download records. In-depth release reviews use images and text from selected projects.', 'Access times, request and error logs, IP addresses and other operational or security information may be generated automatically. Feedback includes your message and account name, email or account identifier.'] },
        { title: 'Purposes', paragraphs: ['We use information for identification, sign-in, profiles, image recognition, translation, editing, generation, saving, downloads, project restoration and release reviews. Necessary information is also used to resolve errors, prevent abuse, improve security and quality, respond to feedback and delete accounts.'] },
        { title: 'Retention and deletion', paragraphs: ['Account information and member projects are kept until account deletion or deletion of the relevant data. Expiring guest projects are cleaned up based on their stated expiry time. The server default is 24 hours after creation and may vary with operational settings.', 'Email and Naver sign-in tokens are valid for up to 30 days after issue. Signing out removes sign-in information stored in this browser. Google sign-in also follows the authentication provider’s session policy.', 'Service logs are retained for the minimum period needed for security and incident response. Information subject to legal retention requirements is stored separately for the required period. Account deletion removes projects, images, profiles and linked authentication information in sequence; deleted data cannot be recovered.', 'Public GitHub feedback is not automatically deleted when you delete your account. To request removal, contact us below with the issue URL.'] },
        { title: 'Browser storage', paragraphs: ['Sign-in tokens, account information and your site language are kept in local storage; workflow state is kept in session storage. You can clear site data in your browser settings, but this may sign you out and prevent restoration of your work. Sign out after using a shared device.'] },
        { title: 'External services and transfers', paragraphs: ['Supabase provides the database, file storage and Google authentication. Vercel and Render host the website and server. Google and Naver provide the social sign-in option you choose.', 'Depending on enabled features and server settings, OpenAI, Groq or Google Gemini may receive images or relevant image regions, recognized text, target languages, generation prompts and project content for review. These are used for OCR, translation, image generation, text and font analysis, and release reviews.', 'Processing locations and retention policies vary by provider and operational settings, and processing may take place outside your country. Contact us below for related processing information. Glocalizer does not use uploaded images to train its own AI models; external providers process data under their own policies.', 'Submitting feedback may create a public GitHub issue containing your message and account name, email or account identifier. Do not include passwords, private contact details or anything you do not want made public.'] },
        { title: 'Your rights', paragraphs: ['You can view and edit account information or delete your account in Settings. Send access, correction, deletion or processing restriction requests to the email below. Identify the data and account concerned so we can verify your identity; do not send your password. If legal restrictions prevent us from fulfilling a request, we will explain why.'] },
        { title: 'Security measures', paragraphs: ['We protect information using one-way password hashing, private file storage, expiring signed URLs, authentication and authorization checks, request limits and separate server secrets. Information no longer needed or past its retention period is deleted using methods designed to prevent recovery.'] },
        { title: 'Contact and policy changes', paragraphs: ['Glocalizer Team handles privacy inquiries at the email below. If laws, the service or processing practices change, we will announce the effective date and significant changes on the service.'] },
      ],
    },
    terms: {
      title: 'Terms of Service', description: 'These terms set out the conditions for Glocalizer’s sticker generation, localization and release review services, and the rights and responsibilities of users and the operating team.',
      sections: [
        { title: 'Scope', paragraphs: ['These terms apply to the Glocalizer website and related features. Please read them and the Privacy Policy before registering or using the service.'] },
        { title: 'Accounts', paragraphs: ['Provide accurate information and keep your sign-in credentials secure. You may not transfer your account or use another person’s account without permission. Report suspicious activity to the team. Account-based features, including generation and saved projects, require sign-in.'] },
        { title: 'Features and availability', paragraphs: ['Features include sticker generation from character descriptions and optional reference images; Korean text recognition and localization into English, Japanese and Chinese; text and image editing; downloads and saved projects. Release review assists with image specification checks, related OGQ content discovery and AI feedback.', 'Features, file counts and sizes, generation and regeneration limits, and processing availability depend on on-screen guidance and operational settings. External AI services may cause delays or failures; processing times and output quality are not guaranteed. Significant changes to features or usage conditions will be announced in advance where possible.'] },
        { title: 'Content rights and processing permission', paragraphs: ['Rights in uploaded images, text and reference materials remain with you or the existing rights holder. You must have permission to process them and must not upload material that infringes copyright, trademarks, likeness rights or privacy.', 'You permit storage, copying, transformation and transfer to external processors only as needed to provide requested features. Ownership or exclusivity of generated output is not guaranteed. Check source-material conditions and rights in the output before use or distribution.'] },
        { title: 'AI output and release reviews', paragraphs: ['OCR, translation, image cleanup, generation and AI reviews may contain errors. Check and edit the source text, image damage, translation quality and caption placement yourself.', 'Specification checks and AI feedback are informational. They are not an official OGQ review, a copyright determination or release approval. Downloading does not submit or publish content automatically. You are responsible for verifying actual submission requirements and rights.'] },
        { title: 'Prohibited conduct', paragraphs: ['Do not upload, generate or distribute unlawful or infringing content; access systems without permission; bypass security; make excessive automated requests; send malware; commit fraud or impersonation; or interfere with operations. Reselling service outputs or features requires the team’s permission.'] },
        { title: 'Restrictions and account deletion', paragraphs: ['Access may be restricted for terms violations, security risks or interference with operations. Contact us below about a restriction.', 'You can delete your account in Settings. Saved projects, images, profiles and linked authentication information are deleted and cannot be recovered. Download needed results beforehand. Removal of public feedback requires a separate request.'] },
        { title: 'Liability', paragraphs: ['The team works to provide a reliable service. Liability may be limited for interruptions beyond reasonable control, such as natural disasters, external service failures or user-caused incidents. This does not limit liability that cannot legally be excluded.'] },
        { title: 'Changes and disputes', paragraphs: ['We announce amended terms and their effective date on the service. Material changes unfavorable to users receive reasonable advance notice. Disputes are governed by the laws of the Republic of Korea and, if unresolved by discussion, fall within the jurisdiction of the court designated by applicable law.'] },
        { title: 'Contact', paragraphs: ['Send questions about the service or these terms to Glocalizer Team at the email below.'] },
      ],
    },
  },
  ja: {
    privacy: {
      title: 'プライバシーポリシー', description: 'Glocalizer Teamは、アカウント管理、スタンプ生成・ローカライズ・公開前チェックに必要な情報を処理します。収集項目、利用目的、保存と削除について説明します。',
      sections: [
        { title: '収集する情報と方法', paragraphs: ['メール登録ではメールアドレス、一方向ハッシュ化したパスワード、任意のニックネームを保存します。Google・Naverログインでは、提供者からアカウント識別子、メールアドレス、名前、プロフィール画像を受け取ります。ご自身で変更した名前や画像も保存します。', 'アップロードや機能の実行時には、元画像・参考画像、認識した文字と座標、翻訳候補、編集内容、キャラクターの説明と生成指示、生成画像・文言、プロジェクトの状態、生成・ダウンロード履歴を処理します。公開前の詳細チェックには選択したプロジェクトの画像と文言を使用します。', 'アクセス時刻、リクエスト・エラーログ、IPアドレスなどの運用・セキュリティ情報が自動生成される場合があります。フィードバックでは、メッセージとアカウントの名前・メールアドレスまたは識別子を処理します。'] },
        { title: '利用目的', paragraphs: ['本人識別、ログイン維持、プロフィール管理、画像認識・翻訳・編集・生成、保存・ダウンロード、プロジェクトの復元、公開前チェックに利用します。障害対応、不正利用防止、セキュリティ・品質改善、フィードバック対応、退会処理にも必要な情報を利用します。'] },
        { title: '保存期間と削除', paragraphs: ['会員情報と会員プロジェクトは、退会または該当データの削除まで保存します。期限付きのゲストプロジェクトは表示された有効期限に基づいて削除処理します。サーバーの既定値は作成後24時間で、運用設定により異なる場合があります。', 'メール・Naverログインのトークンは発行後最大30日間有効です。ログアウトすると、このブラウザーに保存したログイン情報を削除します。Googleログインには認証提供者のセッション方針も適用されます。', 'サービスログはセキュリティと障害対応に必要な最小期間保存します。法令で保存が必要な情報は所定の期間、分離して保存します。退会時にはプロジェクト、画像、プロフィール、関連認証情報を順次削除し、削除後は復元できません。', '公開されたGitHubのフィードバックは退会だけでは自動削除されません。削除をご希望の場合は、イシューのURLを添えて下記へご連絡ください。'] },
        { title: 'ブラウザー内の保存', paragraphs: ['ログイントークン、アカウント情報、サイトの言語設定はローカルストレージに、作業状態はセッションストレージに保存します。ブラウザー設定からサイトデータを削除できますが、ログインや作業の復元ができなくなる場合があります。共有端末では利用後にログアウトしてください。'] },
        { title: '外部サービスとデータの送信', paragraphs: ['Supabaseをデータベース・ファイル保存・Google認証に、Vercel・Renderをサイトとサーバーのホスティングに使用します。Google・Naverは選択したソーシャルログインに使用します。', '有効な機能とサーバー設定に応じて、OpenAI・Groq・Google Geminiに画像や必要な画像領域、認識文、翻訳先言語、生成指示、チェック対象のプロジェクト情報を送信する場合があります。目的はOCR、翻訳、画像生成、文言・フォント分析、公開前チェックです。', '処理場所や保存方針は提供者と運用設定により異なり、国外で処理される場合があります。関連情報は下記へお問い合わせください。Glocalizerはアップロード画像を自社AIモデルの学習に使用しません。外部提供者の処理には各社の方針が適用されます。', 'フィードバックを送信すると、メッセージとアカウントの名前・メールアドレスまたは識別子を含む公開GitHubイシューが作成される場合があります。パスワードや個人の連絡先など、公開したくない情報は記入しないでください。'] },
        { title: '利用者の権利', paragraphs: ['設定画面でアカウント情報の確認・変更・退会ができます。開示、訂正、削除、処理停止のご依頼は下記メールへお送りください。対象データとアカウントを確認できる情報をご提示いただき、本人確認後に対応します。パスワードは送らないでください。法令上の制限で対応できない場合は理由をご案内します。'] },
        { title: '安全対策', paragraphs: ['パスワードの一方向ハッシュ化、非公開ストレージ、有効期限付き署名URL、認証・権限確認、リクエスト制限、サーバー秘密情報の分離などで保護します。目的達成後や保存期間終了後の情報は、復元が困難な方法で削除します。'] },
        { title: 'お問い合わせと変更', paragraphs: ['個人情報保護の窓口はGlocalizer Teamです。下記メールへお問い合わせください。法令、サービス、処理方法の変更に伴い本方針を改定する場合は、施行日と主な変更をサービス画面でお知らせします。'] },
      ],
    },
    terms: {
      title: '利用規約', description: '本規約はGlocalizerのスタンプ生成・ローカライズ・公開前チェックの利用条件と、利用者および運営チームの権利・責任を定めます。',
      sections: [
        { title: '適用範囲', paragraphs: ['本規約はGlocalizerのウェブサービスと関連機能に適用されます。登録や利用の前に本規約とプライバシーポリシーをご確認ください。'] },
        { title: 'アカウント管理', paragraphs: ['正確な情報を入力し、ログイン手段を安全に管理してください。アカウントの譲渡や他人のアカウントの無断利用は禁止します。不審な活動は運営チームへお知らせください。生成やプロジェクト保存などのアカウント機能にはログインが必要です。'] },
        { title: '機能と利用範囲', paragraphs: ['キャラクター説明と任意の参考画像によるスタンプ生成、画像内の韓国語認識と英語・日本語・中国語へのローカライズ、文字・画像編集、ダウンロード、プロジェクト保存を提供します。公開前チェックは画像規格の確認、関連するOGQコンテンツの検索、AIフィードバックを補助します。', '機能、ファイル数・容量、生成・再生成回数、処理可能範囲は画面の案内と運用設定により制限される場合があります。外部AIサービスにより遅延や失敗が発生する場合があり、処理時間や品質は保証しません。重要な機能・利用条件の変更は可能な範囲で事前に案内します。'] },
        { title: 'コンテンツの権利と処理許諾', paragraphs: ['アップロードした画像・文言・参考資料の権利は利用者または既存の権利者に帰属します。利用者は処理に必要な権限を持つ必要があり、著作権・商標権・肖像権・個人情報を侵害する資料をアップロードできません。', '依頼した機能の提供に必要な範囲で、保存・複製・変換と外部処理サービスへの送信を許諾するものとします。生成結果の権利帰属や独占性は保証しません。利用・配布前に元資料の条件と結果の権利関係をご確認ください。'] },
        { title: 'AI結果と公開前チェック', paragraphs: ['OCR、翻訳、画像の文字除去、生成、AIチェックには誤りが含まれる場合があります。原文、画像の損傷、翻訳の自然さ、文字配置をご自身で確認・修正してください。', '規格チェックとAIフィードバックは参考情報であり、OGQの公式審査、著作権判断、公開承認ではありません。ダウンロードしても自動で申請・公開されません。実際の提出基準と権利は利用者が確認してください。'] },
        { title: '禁止行為', paragraphs: ['違法または権利侵害となるコンテンツのアップロード・生成・配布、不正アクセス、セキュリティ回避、過剰な自動リクエスト、マルウェア送信、詐欺・なりすまし、運営妨害を禁止します。運営チームの許可なくサービスの結果や機能を再販売できません。'] },
        { title: '利用制限と退会', paragraphs: ['規約違反、セキュリティ上の危険、運営妨害が確認された場合、利用を制限することがあります。制限に関するお問い合わせは下記へご連絡ください。', '設定画面から退会できます。保存したプロジェクト・画像・プロフィールと関連認証情報は削除され、復元できません。必要な結果は事前にダウンロードしてください。公開フィードバックの削除には別途依頼が必要です。'] },
        { title: '責任の範囲', paragraphs: ['安定したサービス提供に努めますが、自然災害、外部サービス障害、利用者の責任など、合理的に管理できない中断については責任が制限される場合があります。法令上排除できない責任を制限するものではありません。'] },
        { title: '規約変更と紛争解決', paragraphs: ['変更内容と施行日はサービス画面で案内します。利用者に不利な重要な変更には合理的な事前案内期間を設けます。紛争には大韓民国の法令を適用し、協議で解決しない場合は関連法令で定める裁判所を管轄裁判所とします。'] },
        { title: 'お問い合わせ', paragraphs: ['サービスと規約については、下記のGlocalizer Teamのメールへお問い合わせください。'] },
      ],
    },
  },
  zh: {
    privacy: {
      title: '隐私政策', description: 'Glocalizer Team 处理账号管理、表情包生成、本地化及发布前检查所需的信息。本政策说明收集内容、使用目的以及保存和删除方式。',
      sections: [
        { title: '收集的信息及方式', paragraphs: ['邮箱注册时保存邮箱地址、经单向哈希处理的密码和选填昵称。Google 或 Naver 登录时处理提供方传递的账号标识、邮箱、姓名和头像。您自行更新的昵称和头像也会保存。', '上传文件和使用功能时，处理原图、参考图片、识别文字及坐标、翻译候选、编辑内容、角色描述和生成指令、生成图片与文案、项目状态以及生成和下载记录。发布前深度检查会使用所选项目的图片与文字。', '访问时间、请求和错误日志、IP 地址等运营和安全信息可能自动生成。提交反馈时处理反馈内容以及账号姓名、邮箱或账号标识。'] },
        { title: '使用目的', paragraphs: ['信息用于用户识别、保持登录、资料管理、图片识别、翻译、编辑、生成、保存、下载、恢复项目及发布前检查。也会使用必要信息处理故障、防止滥用、改善安全与质量、回复反馈及注销账号。'] },
        { title: '保存期限与删除', paragraphs: ['会员信息和会员项目保存至账号注销或相应数据删除。设有期限的访客项目按照显示的到期时间进行清理。服务器默认期限为创建后 24 小时，可能随运营设置变化。', '邮箱和 Naver 登录令牌自签发起最长有效 30 天。退出登录会清除此浏览器保存的登录信息。Google 登录还适用认证提供方的会话政策。', '服务日志仅在安全和故障处理所需的最短期间保存。依法必须保留的信息会在规定期限内单独保存。注销时依次删除项目、图片、个人资料及关联认证信息，删除后无法恢复。', '公开的 GitHub 反馈不会随账号注销自动删除。如需删除，请将相关 issue 链接发送至下方邮箱。'] },
        { title: '浏览器存储', paragraphs: ['登录令牌、账号信息及网站语言保存在本地存储中，工作状态保存在会话存储中。您可以在浏览器设置中清除网站数据，但可能因此退出登录或无法恢复工作。使用公共设备后请退出登录。'] },
        { title: '外部服务与数据传输', paragraphs: ['Supabase 用于数据库、文件存储和 Google 认证；Vercel 和 Render 用于网站和服务器托管。Google 和 Naver 提供您选择的社交登录方式。', '根据启用的功能和服务器设置，可能向 OpenAI、Groq 或 Google Gemini 传输图片或所需图片区域、识别文字、目标语言、生成指令及待检查项目内容，用于 OCR、翻译、图片生成、文字与字体分析及发布前检查。', '处理地点和保存政策因提供方及运营设置而异，数据可能在境外处理。有关处理信息可通过下方联系方式咨询。Glocalizer 不会将上传图片用于训练自有 AI 模型；外部提供方按其各自政策处理数据。', '提交反馈可能创建公开的 GitHub issue，其中包含消息及账号姓名、邮箱或账号标识。请勿填写密码、私人联系方式或其他不希望公开的信息。'] },
        { title: '用户权利', paragraphs: ['您可以在设置中查看和修改账号信息或注销账号。如需查阅、更正、删除或停止处理，请发送邮件至下方地址，并提供用于确认目标数据和账号的信息。我们在核实身份后处理，请勿发送密码。如因法律限制无法满足请求，我们会说明原因。'] },
        { title: '安全措施', paragraphs: ['通过密码单向哈希、私有文件存储、限时签名链接、身份认证与权限检查、请求频率限制和服务器密钥隔离等措施保护信息。处理目的达成或保存期限结束后，以难以恢复的方式删除信息。'] },
        { title: '联系与政策变更', paragraphs: ['Glocalizer Team 负责隐私相关咨询，联系方式见下方邮箱。如因法律、服务或处理方式变化而更新政策，将在服务页面公布生效日期和主要变更。'] },
      ],
    },
    terms: {
      title: '服务条款', description: '本条款规定 Glocalizer 表情包生成、本地化及发布前检查服务的使用条件，以及用户与运营团队的权利和责任。',
      sections: [
        { title: '适用范围', paragraphs: ['本条款适用于 Glocalizer 网站及相关功能。注册或使用前请阅读本条款及隐私政策。'] },
        { title: '账号管理', paragraphs: ['请提供准确信息并妥善保管登录凭证。禁止转让账号或擅自使用他人账号。如发现异常活动，请通知运营团队。生成和项目保存等账号功能需要登录。'] },
        { title: '功能与使用范围', paragraphs: ['提供根据角色描述及可选参考图片生成表情包、识别图片内韩文并本地化为英语、日语和中文、文字与图片编辑、下载及项目保存。发布前检查辅助检查图片规格、搜索相关 OGQ 内容并提供 AI 反馈。', '功能、文件数量与大小、生成及重新生成次数和可处理范围可能受页面提示及运营设置限制。外部 AI 服务可能导致延迟或失败，不保证处理时间或结果质量。重要功能或使用条件变更将在可能范围内提前告知。'] },
        { title: '内容权利与处理许可', paragraphs: ['上传图片、文字和参考资料的权利仍归用户或原权利人所有。您必须拥有处理这些资料的权限，不得上传侵犯著作权、商标权、肖像权或隐私的内容。', '您允许在提供所请求功能的必要范围内保存、复制、转换内容并传输给外部处理服务。不保证生成结果的权利归属或独占性。使用或分发前，请核实原始资料的使用条件及结果的相关权利。'] },
        { title: 'AI 结果与发布前检查', paragraphs: ['OCR、翻译、图片文字清理、生成和 AI 检查可能存在错误。请自行核对和修改原文、图片受损情况、译文自然度及文案位置。', '规格检查和 AI 反馈仅供参考，不属于 OGQ 官方审核、版权判定或发布批准。下载不代表自动提交或发布。用户需自行核实实际提交标准及相关权利。'] },
        { title: '禁止行为', paragraphs: ['禁止上传、生成或传播违法或侵权内容，未经授权访问、绕过安全措施、过量自动请求、发送恶意软件、诈骗、冒充他人或干扰服务。未经运营团队许可，不得转售服务结果或功能。'] },
        { title: '使用限制与注销', paragraphs: ['发现违反条款、安全风险或干扰运营的行为时，可能限制使用。如对限制有疑问，请通过下方联系方式咨询。', '您可以在设置中注销账号。已保存的项目、图片、个人资料及关联认证信息将被删除且无法恢复。请提前下载所需结果。删除公开反馈需单独提出请求。'] },
        { title: '责任范围', paragraphs: ['团队努力提供稳定服务。对于自然灾害、外部服务故障或用户原因等合理控制范围以外的中断，责任可能受到限制。本条款不限制依法不得排除的责任。'] },
        { title: '条款变更与争议解决', paragraphs: ['条款变更及生效日期将在服务页面公布。对用户不利的重要变更会给予合理的提前通知期。服务争议适用大韩民国法律；协商无法解决时，由相关法律规定的法院管辖。'] },
        { title: '联系我们', paragraphs: ['有关服务和条款的问题，请发送至下方 Glocalizer Team 邮箱。'] },
      ],
    },
  },
}
