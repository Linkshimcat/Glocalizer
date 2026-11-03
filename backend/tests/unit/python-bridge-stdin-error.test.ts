import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { AppError } from '../../src/errors/app-error.js';
import { runCvInpaint } from '../../src/image/cv-inpaint-bridge.js';
import { paddleOcrProvider } from '../../src/ocr/paddle/paddle-ocr.provider.js';

// Python 브리지가 입력을 다 읽기 전에 죽으면(메모리 부족·SIGKILL) 남은 stdin 쓰기가 EPIPE를 낸다.
// stdin에 'error' 리스너가 없으면 uncaught exception으로 API 프로세스 전체가 내려가므로,
// 요청 하나의 실패로만 끝나야 한다. node에 .py 파일을 넘기면 문법 오류로 stdin을 읽지 않고 바로 종료한다.
describe('Python 브리지가 입력을 읽기 전에 종료될 때', () => {
  const original = env.OCR_PYTHON_EXECUTABLE;
  // 파이프 버퍼(수십 KB)보다 훨씬 커서 쓰기가 자식 종료 시점까지 남아 있게 한다.
  const large = Buffer.alloc(8 * 1024 * 1024, 7);

  beforeEach(() => {
    env.OCR_PYTHON_EXECUTABLE = process.execPath;
  });
  afterEach(() => {
    env.OCR_PYTHON_EXECUTABLE = original;
  });

  it('Paddle OCR 요청은 AppError로 거절되고 프로세스는 살아 있다', async () => {
    await expect(paddleOcrProvider.recognize(large)).rejects.toBeInstanceOf(AppError);
    // 늦게 오는 stdin 오류 이벤트까지 처리될 시간을 둔다.
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it('OpenCV inpaint 요청은 AppError로 거절되고 프로세스는 살아 있다', async () => {
    await expect(runCvInpaint({ imageBase64: large.toString('base64'), maskBase64: '' })).rejects.toBeInstanceOf(AppError);
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
});
