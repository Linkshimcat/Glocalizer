import LegalDocument from '../components/LegalDocument'

const EFFECTIVE_DATE = '2026년 9월 20일'

export default function Privacy() {
  return (
    <LegalDocument
      title="개인정보처리방침"
      description="Glocalizer Team은 서비스 제공에 필요한 범위에서 개인정보를 처리하며, 이용자의 정보를 안전하게 보호하기 위해 노력합니다."
      effectiveDate={EFFECTIVE_DATE}
      sections={[
        {
          title: '처리하는 개인정보와 수집 방법',
          content: (
            <>
              <ul>
                <li><strong>이메일 가입:</strong> 이메일 주소, 암호화된 비밀번호, 선택 입력한 닉네임</li>
                <li><strong>Google·Naver 로그인:</strong> 제공자가 전달하는 계정 식별자, 이메일, 이름, 프로필 이미지</li>
                <li><strong>프로필 관리:</strong> 닉네임과 이용자가 직접 등록한 프로필 이미지</li>
                <li><strong>서비스 이용:</strong> 업로드 이미지, 인식·번역 문구, 편집 내용, 프로젝트 및 생성 기록</li>
                <li><strong>자동 생성 정보:</strong> 접속 시각, 요청 기록, 오류 기록, IP 주소 등 서비스 운영·보안에 필요한 정보</li>
                <li><strong>피드백:</strong> 피드백 내용, 계정의 이름·이메일 또는 계정 식별자</li>
              </ul>
              <p>정보는 회원가입, 소셜 로그인, 파일 업로드, 프로필 수정, 피드백 제출 과정에서 수집됩니다.</p>
            </>
          ),
        },
        {
          title: '개인정보의 처리 목적',
          content: (
            <ul>
              <li>회원 식별, 로그인 유지, 계정 및 프로필 관리</li>
              <li>이모티콘 이미지의 OCR, 번역, 편집, 생성 및 결과 저장</li>
              <li>저장된 프로젝트 제공과 계정 탈퇴 처리</li>
              <li>오류 대응, 부정 이용 방지, 서비스 보안과 품질 개선</li>
              <li>이용자가 제출한 피드백의 확인과 처리</li>
            </ul>
          ),
        },
        {
          title: '보유 및 이용 기간',
          content: (
            <>
              <ul>
                <li>회원 정보와 회원 프로젝트: 회원 탈퇴 시까지</li>
                <li>비회원 프로젝트와 업로드 파일: 프로젝트 생성 시 안내된 만료 시점까지</li>
                <li>로그인 토큰: 발급일로부터 최대 30일 또는 로그아웃·탈퇴 시까지</li>
                <li>서비스 로그: 보안과 장애 대응에 필요한 최소 기간</li>
              </ul>
              <p>관계 법령에 따라 보존할 의무가 있는 정보는 해당 법령이 정한 기간 동안 별도로 보관할 수 있습니다.</p>
            </>
          ),
        },
        {
          title: '외부 서비스 이용과 처리 위탁',
          content: (
            <>
              <p>서비스 운영을 위해 다음 외부 서비스를 이용할 수 있습니다. 실제 전달 정보는 이용 기능과 운영 환경 설정에 따라 달라집니다.</p>
              <ul>
                <li><strong>Supabase:</strong> 데이터베이스, 파일 저장소, Google 인증</li>
                <li><strong>Vercel·Render:</strong> 프론트엔드와 백엔드 호스팅</li>
                <li><strong>Google·Naver:</strong> 소셜 로그인</li>
                <li><strong>OpenAI·Groq·Google Gemini:</strong> 선택적으로 이미지 인식, 번역, 이미지 생성 또는 품질 분석</li>
                <li><strong>GitHub:</strong> 이용자가 피드백을 제출한 경우 이슈 등록</li>
              </ul>
              <p>피드백은 공개 GitHub 이슈로 등록될 수 있으며 계정 이름이나 이메일이 포함될 수 있습니다. 피드백 입력란에 비밀번호, 연락처 등 민감한 정보를 작성하지 마세요.</p>
              <p>Glocalizer는 업로드 이미지를 자체 AI 모델 학습 데이터로 사용하지 않습니다.</p>
            </>
          ),
        },
        {
          title: '개인정보의 파기',
          content: <p>보유 기간이 끝나거나 처리 목적이 달성된 정보는 복구하기 어려운 방법으로 삭제합니다. 계정 탈퇴 시 저장된 프로젝트, 이미지, 프로필 정보와 연결된 인증 정보를 순차적으로 삭제합니다. 법령상 보존 의무가 있는 정보는 다른 정보와 분리해 보관한 뒤 기간 종료 후 파기합니다.</p>,
        },
        {
          title: '이용자의 권리와 행사 방법',
          content: (
            <>
              <p>이용자는 설정 화면에서 자신의 계정 정보를 확인·수정하고 계정을 탈퇴할 수 있습니다. 개인정보의 열람, 정정, 삭제 또는 처리 정지를 요청할 수도 있습니다.</p>
              <p>계정 탈퇴 후에는 삭제된 프로젝트와 이미지를 복구할 수 없습니다.</p>
            </>
          ),
        },
        {
          title: '개인정보의 안전성 확보 조치',
          content: (
            <ul>
              <li>비밀번호의 단방향 암호화 저장</li>
              <li>비공개 저장소와 만료되는 서명 URL 사용</li>
              <li>인증·권한 확인, 요청 횟수 제한과 보안 로그 관리</li>
              <li>운영 비밀키의 서버 환경변수 분리와 접근 제한</li>
            </ul>
          ),
        },
        {
          title: '개인정보 보호 문의',
          content: (
            <>
              <p><strong>담당:</strong> Glocalizer Team</p>
              <p><strong>문의:</strong> <a href="mailto:veyrix0816@gmail.com">veyrix0816@gmail.com</a></p>
            </>
          ),
        },
        {
          title: '처리방침의 변경',
          content: <p>법령, 서비스 또는 처리 방식이 변경되면 이 방침도 수정될 수 있습니다. 중요한 변경 사항은 시행 전에 서비스 화면을 통해 안내합니다.</p>,
        },
      ]}
    />
  )
}
