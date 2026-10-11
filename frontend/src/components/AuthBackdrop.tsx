import { useId } from 'react'
import worldDots from '../assets/login/world-dots.svg'

const GREETINGS = [
  { text: 'Hello', language: 'en', position: 'hello' },
  { text: 'こんにちは', language: 'ja', position: 'japanese' },
  { text: 'Bonjour', language: 'fr', position: 'bonjour' },
  { text: '你好', language: 'zh', position: 'chinese' },
]

/** Static, non-interactive artwork; the opaque form always sits above it. */
export default function AuthBackdrop() {
  const washId = useId()

  return (
    <div className="auth-backdrop" aria-hidden="true" inert>
      <svg className="auth-wash" viewBox="0 0 1400 840" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <filter id={washId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".018 .025" numOctaves="3" seed="17" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="26" xChannelSelector="R" yChannelSelector="G" result="wash" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .3 .3 .3 0 .35" result="paper" />
            <feComposite in="wash" in2="paper" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${washId})`}>
          <g transform="translate(60 72) scale(.76)">
          <path fill="#91bedb" opacity=".2" d="M95 225C110 158 166 132 216 145C260 157 273 129 320 146C357 160 354 203 397 213C448 225 449 262 426 295C405 325 447 367 401 396C361 421 340 393 295 414C247 437 205 400 164 394C102 386 130 344 100 315C74 289 78 254 95 225Z" />
          <path fill="#b9d9e8" opacity=".26" d="M137 233C169 191 206 182 255 202C293 217 317 195 350 222C375 242 351 278 374 306C396 335 370 369 331 367C290 366 275 389 239 368C213 352 174 372 155 343C140 322 148 302 127 280C111 263 120 248 137 233Z" />
          </g>
          <g transform="translate(236 100) scale(.8)">
          <path fill="#a9d6c7" opacity=".24" d="M1002 465C1033 421 1075 437 1101 403C1129 366 1173 380 1191 406C1212 438 1249 418 1273 449C1299 482 1267 512 1284 545C1307 590 1264 619 1224 606C1187 594 1171 628 1123 612C1083 598 1066 622 1040 594C1017 570 1029 548 1006 527C985 508 984 488 1002 465Z" />
          <path fill="#b9e3db" opacity=".25" d="M1071 463C1093 440 1128 461 1151 436C1179 411 1200 442 1206 466C1212 491 1250 484 1257 513C1264 543 1240 575 1208 563C1176 552 1157 587 1124 567C1096 550 1066 563 1064 536C1062 509 1047 488 1071 463Z" />
          </g>
        </g>
      </svg>

      <div className="auth-map">
        <img src={worldDots} width="1000" height="400" alt="" decoding="async" />
        <svg viewBox="0 0 1000 400" focusable="false">
          <g fill="none" stroke="#7398b0" strokeWidth=".8" opacity=".38">
            <path d="M173 121Q471 -34 851 120" />
            <path d="M285 294Q629 422 873 202" />
          </g>
          <g fill="#6c9fb0" opacity=".6">
            <circle cx="173" cy="121" r="3" /><circle cx="851" cy="120" r="3" />
            <circle cx="285" cy="294" r="2.5" /><circle cx="873" cy="202" r="2.5" />
          </g>
        </svg>
      </div>

      {GREETINGS.map(greeting => (
        <span key={greeting.language} lang={greeting.language} className={`auth-greeting auth-greeting--${greeting.position}`}>
          {greeting.text}
        </span>
      ))}
    </div>
  )
}
