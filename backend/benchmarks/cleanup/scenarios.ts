/**
 * 클린업 벤치마크 시나리오. 사용자 이미지·OGQ 스티커는 저장소에 넣을 수 없으므로(개인정보·IP 이용 제한),
 * 실제로 실패했던 유형을 코드로 재현한다. 배경과 글자를 따로 렌더링해 "글자 없는 정답 이미지"와
 * "글자 픽셀 마스크"를 자동으로 얻는다.
 */
export const WIDTH = 320;
export const HEIGHT = 200;

export interface Scenario {
  name: string;
  /** 배경만 그린 SVG 안쪽. 투명 배경이면 불투명 사각형을 넣지 않는다. */
  background: string;
  /** 글자만 그린 SVG 안쪽(투명 캔버스 위). */
  text: string;
  /** 렌더된 배경에 얹는 후처리(노이즈 등). 시드 고정. */
  noise?: number;
  /** 이 시나리오가 알려진 난제인지 — 통과율 예산에서 별도로 다룬다. */
  hard?: boolean;
}

const KOREAN = '고마워요';
const textNode = (fill: string, extra = '', size = 54, y = 118, content = KOREAN) =>
  `<text x="160" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="900" fill="${fill}" ${extra}>${content}</text>`;
const rect = (fill: string) => `<rect width="${WIDTH}" height="${HEIGHT}" fill="${fill}"/>`;
const pattern = (id: string, size: number, inner: string) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${inner}</pattern><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${id})"/>`;

export const SCENARIOS: Scenario[] = [
  { name: 'solid-white', background: rect('#ffffff'), text: textNode('#222') },
  { name: 'solid-yellow', background: rect('#ffe066'), text: textNode('#333') },
  { name: 'solid-dark-light-text', background: rect('#1d2333'), text: textNode('#f4f4f4') },
  { name: 'gradient-mild', background: `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd6e0"/><stop offset="1" stop-color="#ffb3c6"/></linearGradient><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>`, text: textNode('#222') },
  { name: 'text-with-white-outline', background: rect('#7cc4ff'), text: textNode('#222', 'stroke="#ffffff" stroke-width="7" paint-order="stroke"') },
  { name: 'two-color-text', background: rect('#fff4d6'), text: `<text x="160" y="118" text-anchor="middle" font-family="sans-serif" font-size="54" font-weight="900"><tspan fill="#e63946">고마</tspan><tspan fill="#1d3557">워요</tspan></text>` },
  {
    name: 'speech-bubble-tight',
    background: `${rect('#bcd4ff')}<rect x="14" y="52" width="292" height="92" rx="46" fill="#ffffff" stroke="#111" stroke-width="5"/>`,
    text: textNode('#222', '', 46, 116),
  },
  {
    name: 'transparent-clean',
    background: '',
    text: textNode('#222'),
  },
  {
    name: 'transparent-character-above',
    background: `<ellipse cx="160" cy="56" rx="110" ry="40" fill="#111"/>`,
    text: textNode('#222', 'stroke="#ffffff" stroke-width="5" paint-order="stroke"', 50, 138),
  },
  {
    name: 'transparent-bubble-white',
    background: `<rect x="14" y="52" width="292" height="92" rx="46" fill="#ffffff" stroke="#111" stroke-width="5"/>`,
    text: textNode('#222', '', 46, 116),
  },
  { name: 'stripes', background: pattern('p', 20, `<rect width="20" height="20" fill="#d9f0ff"/><rect width="10" height="20" fill="#7cc4ff"/>`), text: textNode('#222'), hard: true },
  { name: 'dots-sparse', background: pattern('p', 18, `<rect width="18" height="18" fill="#fff4d6"/><circle cx="9" cy="9" r="3" fill="#e8a33d"/>`), text: textNode('#222'), hard: true },
  { name: 'dots-dense', background: pattern('p', 14, `<rect width="14" height="14" fill="#fff4d6"/><circle cx="7" cy="7" r="4.5" fill="#e8a33d"/>`), text: textNode('#222'), hard: true },
  { name: 'checker', background: pattern('p', 24, `<rect width="24" height="24" fill="#ffffff"/><rect width="12" height="12" fill="#c8c8c8"/><rect x="12" y="12" width="12" height="12" fill="#c8c8c8"/>`), text: textNode('#222'), hard: true },
  { name: 'gradient-strong', background: `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5f6d"/><stop offset="1" stop-color="#3a7bd5"/></linearGradient><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>`, text: textNode('#ffffff'), hard: true },
  { name: 'noisy-photo', background: rect('#8fa3b8'), text: textNode('#ffffff', 'stroke="#222" stroke-width="3" paint-order="stroke"'), noise: 60, hard: true },
  {
    name: 'neon-glow',
    background: rect('#141a2b'),
    text: `<defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${textNode('#dff3ff', 'stroke="#2a5bff" stroke-width="4" filter="url(#glow)"')}`,
    hard: true,
  },
];
