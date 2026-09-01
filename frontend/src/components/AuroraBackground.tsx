/**
 * 오로라 배경 — 드롭존과 같은 conic 팔레트를 화면 전체로 키운 색 필드 위에
 * 물결 띠 세 겹을 얹어 천천히 파도치게 만든 장식 레이어.
 * 실제 색·주기는 index.css의 `.aurora-*` 규칙에 있다.
 * 부모에 `relative`가 필요하고, 콘텐츠는 이 위(z-index)에 올린다.
 */
export default function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <span className="aurora-base" />
      <span className="aurora-field" />
      <span className="aurora-field aurora-field--alt" />
      <span className="aurora-swell aurora-swell--back" />
      <span className="aurora-swell aurora-swell--mid" />
      <span className="aurora-swell aurora-swell--front" />
      {/* 문구 뒤에만 좁게 까는 헤일로 — 대비 확보용 */}
      <span className="aurora-veil" />
    </div>
  )
}
