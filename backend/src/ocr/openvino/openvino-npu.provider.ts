import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import type { OcrProvider, RecognizedRegion } from '../ocr-provider.types.js';
import { toWindowsPath } from './windows-path.js';

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

class OpenVinoNpuBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private readonly pending = new Map<string, PendingRequest>();

  private get scriptPath(): string {
    const currentDirectory = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDirectory, '../../../python/windows_openvino_ocr.py');
  }

  private get modelPath(): string {
    const currentDirectory = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDirectory, '../../../training/ocr/openvino');
  }

  private start(): ChildProcessWithoutNullStreams {
    if (this.child && !this.child.killed) return this.child;
    const child = spawn('cmd.exe', ['/c', env.OCR_WINDOWS_PYTHON, '-3', toWindowsPath(this.scriptPath), '--model-dir', toWindowsPath(this.modelPath), '--jsonl'], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk: Buffer) => this.consume(chunk.toString()));
    child.stderr.on('data', () => undefined);
    child.once('exit', () => this.failPending('Windows NPU OCR bridge가 종료되었습니다. OpenVINO 및 Intel AI Boost 상태를 확인해주세요.'));
    child.once('error', () => this.failPending('Windows NPU OCR bridge를 시작하지 못했습니다. Windows Python과 OpenVINO 상태를 확인해주세요.'));
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
        if (response.error) pending.reject(new AppError('OCR_PROVIDER_FAILED', { provider: 'openvino-npu', bridgeCode: response.error.code }, response.error.message));
        else pending.resolve(response.regions ?? []);
      } catch {
        // Windows OpenVINO 라이브러리의 진단 출력은 JSONL 프로토콜에서 제외한다.
      }
    }
  }

  private failPending(message: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new AppError('OCR_PROVIDER_UNAVAILABLE', { provider: 'openvino-npu' }, message));
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
        rejectRequest(new AppError('OCR_PROVIDER_FAILED', { provider: 'openvino-npu', timeoutMs: env.OCR_TIMEOUT_MS }, 'Windows NPU OCR 처리 시간이 초과되었습니다.'));
      }, env.OCR_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest, timeout });
      child.stdin.write(`${JSON.stringify({ id, imageBase64: image.toString('base64') })}\n`);
    });
  }
}

const bridge = new OpenVinoNpuBridge();

export const openVinoNpuProvider: OcrProvider = {
  name: 'openvino-npu',
  recognize(image) {
    return bridge.recognize(image);
  },
};
