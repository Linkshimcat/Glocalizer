import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export interface CvInpaintRequest {
  imageBase64: string;
  maskBase64: string;
  radius?: number;
  algorithm?: 'telea' | 'ns';
}

interface BridgeResponse {
  resultBase64?: string;
  error?: { code: string; message: string };
}

function scriptPath(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDirectory, '../../python/inpaint_bridge.py');
}

/**
 * OpenCV(cv2.inpaint)로 이미지 일부를 지우고 주변 텍스처를 참고해 자연스럽게 메운다.
 * cv2.inpaint는 모델 로드가 없는 순수 알고리즘이라 OCR bridge와 달리 요청마다 새
 * 프로세스를 띄운다 — 상주 브릿지로 유지할 만큼 자주 호출되지도, 초기화가 비싸지도 않다.
 */
export function runCvInpaint(request: CvInpaintRequest): Promise<Buffer> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(env.OCR_PYTHON_EXECUTABLE, [scriptPath()], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      rejectPromise(new AppError('IMAGE_CLEANUP_FAILED', undefined, 'OpenCV inpaint 처리 시간이 초과되었습니다.'));
    }, env.OCR_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-2_000);
    });
    child.once('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectPromise(new AppError('IMAGE_CLEANUP_FAILED', undefined, 'OpenCV inpaint bridge를 시작하지 못했습니다. OCR_PYTHON_EXECUTABLE 설정을 확인해주세요.'));
    });
    child.once('exit', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        const response = JSON.parse(stdout) as BridgeResponse;
        if (response.error) {
          rejectPromise(new AppError('IMAGE_CLEANUP_FAILED', { bridgeCode: response.error.code, stderr: stderr || undefined }, response.error.message));
          return;
        }
        if (!response.resultBase64) {
          rejectPromise(new AppError('IMAGE_CLEANUP_FAILED', { stderr: stderr || undefined }, 'OpenCV inpaint 응답이 비어 있습니다.'));
          return;
        }
        resolvePromise(Buffer.from(response.resultBase64, 'base64'));
      } catch {
        rejectPromise(new AppError('IMAGE_CLEANUP_FAILED', { stderr: stderr || undefined }, 'OpenCV inpaint 응답을 해석하지 못했습니다.'));
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}
