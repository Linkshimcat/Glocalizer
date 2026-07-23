import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { OcrProvider, RecognizedRegion } from '../ocr-provider.types.js';

interface BridgeResponse {
  id: string;
  regions?: RecognizedRegion[];
  error?: { code: string; message: string };
}

interface PendingRequest {
  resolve: (regions: RecognizedRegion[]) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

class PaddleBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private readonly pending = new Map<string, PendingRequest>();

  private get scriptPath(): string {
    const currentDirectory = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDirectory, '../../../python/ocr_bridge.py');
  }

  private start(): ChildProcessWithoutNullStreams {
    if (this.child && !this.child.killed) return this.child;
    const child = spawn(env.OCR_PYTHON_EXECUTABLE, [this.scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk: Buffer) => this.consume(chunk.toString()));
    child.stderr.on('data', () => undefined);
    child.once('exit', () => this.failPending('OCR bridge가 종료되었습니다. PaddleOCR 설치 상태를 확인해주세요.'));
    child.once('error', () => this.failPending('OCR bridge를 시작하지 못했습니다. OCR_PYTHON_EXECUTABLE 설정을 확인해주세요.'));
    this.child = child;
    return child;
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as BridgeResponse;
        const pending = this.pending.get(response.id);
        if (!pending) continue;
        clearTimeout(pending.timeout);
        this.pending.delete(response.id);
        if (response.error) pending.reject(new AppError('OCR_PROVIDER_FAILED', { provider: 'paddle', bridgeCode: response.error.code }, response.error.message));
        else pending.resolve(response.regions ?? []);
      } catch {
        // stdout에 섞인 외부 라이브러리 로그는 무시한다. bridge는 JSONL만 출력해야 한다.
      }
    }
  }

  private failPending(message: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new AppError('OCR_PROVIDER_UNAVAILABLE', { provider: 'paddle' }, message));
    }
    this.pending.clear();
    this.child = null;
  }

  recognize(image: Buffer): Promise<RecognizedRegion[]> {
    const child = this.start();
    const id = randomUUID();
    return new Promise((resolveRequest, rejectRequest) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectRequest(new AppError('OCR_PROVIDER_FAILED', { provider: 'paddle', timeoutMs: env.OCR_TIMEOUT_MS }, 'PaddleOCR 처리 시간이 초과되었습니다.'));
      }, env.OCR_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest, timeout });
      child.stdin.write(`${JSON.stringify({ id, imageBase64: image.toString('base64') })}\n`);
    });
  }
}

const bridge = new PaddleBridge();

export const paddleOcrProvider: OcrProvider = {
  name: 'paddle',
  recognize(image) {
    return bridge.recognize(image);
  },
};
