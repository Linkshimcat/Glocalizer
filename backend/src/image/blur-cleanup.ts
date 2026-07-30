import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { padAndClampBox, padAndClampBoxXY } from '../utils/bbox.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** sharp.extract는 정수 픽셀 좌표만 받으므로, 소수 좌표를 이미지 경계 안으로 반올림해 맞춘다. */
function roundBox(box: PixelBox, imageWidth: number, imageHeight: number): PixelBox {
  const left = Math.max(0, Math.min(imageWidth, Math.round(box.x)));
  const top = Math.max(0, Math.min(imageHeight, Math.round(box.y)));
  const right = Math.max(left, Math.min(imageWidth, Math.round(box.x + box.width)));
  const bottom = Math.max(top, Math.min(imageHeight, Math.round(box.y + box.height)));
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/**
 * OCR 영역을 강하게 블러 처리해 원본 글자 형태를 알아볼 수 없게 만든다.
 * 지우기/inpaint 대신 이 방식을 쓰면 배경 내용과 무관하게 항상 동작해서
 * "배경이 복잡해서 못 지웠다"는 실패 축 자체가 사라진다.
 */
export async function applyBlurCleanup(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
): Promise<Buffer> {
  // OCR bbox가 실제 글자 범위보다 상당히 타이트하게 잡히는 경우가 실사용 이미지에서 흔히
  // 확인됐다(여러 음절 중 마지막 글자가 bbox 밖으로 크게 삐져나가는 경우 등). 예전 마스크
  // 생성기는 연결성분 탐색으로 이런 삐져나온 획까지 찾아냈지만, 블러는 그런 콘텐츠 인식 없이
  // 순수 사각형만 다루므로 여백을 넉넉하게 잡아야 한다 — 블러는 지우기와 달리 배경을 망가뜨리지
  // 않으니 살짝 과하게 덮는 쪽이 글자가 남는 것보다 훨씬 안전하다.
  //
  // 가로/세로 패딩은 반드시 각 축 자신의 크기 기준으로 따로 계산한다. 하나의 값을 두 축에
  // 똑같이 적용하면, 한 줄짜리 캡션처럼 가로로 긴 박스에서는 가로 기준으로 커진 패딩이
  // 세로 축까지 밀고 들어가 말풍선 위아래의 캐릭터 얼굴 등 관계없는 영역까지 블러 처리되는
  // 문제가 실사용 중 발견됐다. 세로 방향은 글자 한 줄의 획(받침·기울어짐) 정도만 여유를
  // 주면 충분해서 상한을 훨씬 낮게 둔다.
  const paddingX = Math.max(20, Math.min(150, Math.ceil(box.width * 0.4)));
  const paddingY = Math.max(12, Math.min(50, Math.ceil(box.height * 0.7)));
  const target = roundBox(padAndClampBoxXY(box, paddingX, paddingY, imageWidth, imageHeight), imageWidth, imageHeight);
  const sigma = clamp(Math.round(Math.min(target.width, target.height) * 0.4), 10, 60);

  // 블러 대상 영역만 잘라서 blur하면 크롭 경계에 주변 컨텍스트가 없어 이음매가 보일 수 있다.
  // sigma*2 만큼 더 넓은 영역을 블러링한 뒤 그중 target 부분만 다시 잘라 원본에 합성한다.
  const contextBox = roundBox(padAndClampBox(target, Math.ceil(sigma * 2), imageWidth, imageHeight), imageWidth, imageHeight);

  const blurredContext = await sharp(buffer)
    .extract({ left: contextBox.x, top: contextBox.y, width: contextBox.width, height: contextBox.height })
    .blur(sigma)
    .toBuffer();

  const patch = await sharp(blurredContext)
    .extract({
      left: target.x - contextBox.x,
      top: target.y - contextBox.y,
      width: target.width,
      height: target.height,
    })
    .toBuffer();

  return sharp(buffer)
    .composite([{ input: patch, left: target.x, top: target.y }])
    .png()
    .toBuffer();
}
