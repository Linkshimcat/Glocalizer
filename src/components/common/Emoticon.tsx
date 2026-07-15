import { cn } from "@/lib/utils"

type Mood = "study" | "wow" | "agree" | "happy" | "cheer" | "cool" | "default"

const MOOD_BY_PHRASE: Record<string, Mood> = {
  열공: "study",
  대박: "wow",
  인정: "agree",
  행복: "happy",
  화이팅: "cheer",
  최고: "cool",
}

const BODY_COLORS: Record<Mood, string> = {
  study: "#FFD54A",
  wow: "#FF8A5C",
  agree: "#7FD1AE",
  happy: "#FFC24B",
  cheer: "#8FC7FF",
  cool: "#B4A7FF",
  default: "#FFD54A",
}

/**
 * A friendly, original round-blob character. No copyrighted art.
 * Mood is derived from the Korean source phrase for visual variety.
 */
export function Emoticon({
  phrase,
  className,
}: {
  phrase?: string
  className?: string
}) {
  const mood: Mood = (phrase && MOOD_BY_PHRASE[phrase]) || "default"
  const body = BODY_COLORS[mood]

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="이모티콘 캐릭터 일러스트"
    >
      {/* soft ground shadow */}
      <ellipse cx="60" cy="104" rx="30" ry="6" fill="#191F28" opacity="0.06" />

      {/* body */}
      <circle cx="60" cy="58" r="40" fill={body} />
      <circle cx="60" cy="58" r="40" fill="#191F28" opacity="0.05" />

      {/* cheeks */}
      <circle cx="40" cy="66" r="6" fill="#FF7A7A" opacity="0.55" />
      <circle cx="80" cy="66" r="6" fill="#FF7A7A" opacity="0.55" />

      {renderFace(mood)}
    </svg>
  )
}

function renderFace(mood: Mood) {
  const eyeFill = "#2A2F36"
  switch (mood) {
    case "study":
      return (
        <>
          {/* focused determined eyes */}
          <path d="M42 50 l10 4" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" />
          <path d="M78 50 l-10 4" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" />
          <path d="M52 70 q8 6 16 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* sweat */}
          <path d="M92 42 q3 6 0 10 q-3-4 0-10Z" fill="#8FC7FF" />
        </>
      )
    case "wow":
      return (
        <>
          <circle cx="47" cy="52" r="6" fill={eyeFill} />
          <circle cx="73" cy="52" r="6" fill={eyeFill} />
          <ellipse cx="60" cy="72" rx="9" ry="11" fill={eyeFill} />
        </>
      )
    case "agree":
      return (
        <>
          <path d="M42 52 q5-5 10 0" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M68 52 q5-5 10 0" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M50 70 q10 8 20 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )
    case "happy":
      return (
        <>
          <path d="M43 54 q4-6 9 0" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M68 54 q4-6 9 0" stroke={eyeFill} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M48 68 q12 12 24 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )
    case "cheer":
      return (
        <>
          <circle cx="47" cy="54" r="5" fill={eyeFill} />
          <circle cx="73" cy="54" r="5" fill={eyeFill} />
          <path d="M50 68 q10 9 20 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* raised arm spark */}
          <path d="M96 34 l4-8 4 8 M100 24 v-6" stroke="#FFCE3A" strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case "cool":
      return (
        <>
          <rect x="38" y="48" width="44" height="12" rx="6" fill={eyeFill} />
          <rect x="30" y="52" width="8" height="4" rx="2" fill={eyeFill} />
          <rect x="82" y="52" width="8" height="4" rx="2" fill={eyeFill} />
          <path d="M52 72 q8 5 16 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )
    default:
      return (
        <>
          <circle cx="47" cy="54" r="5" fill={eyeFill} />
          <circle cx="73" cy="54" r="5" fill={eyeFill} />
          <path d="M50 68 q10 8 20 0" stroke={eyeFill} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )
  }
}
