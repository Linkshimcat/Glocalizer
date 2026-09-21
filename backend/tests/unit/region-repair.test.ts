import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({ env: { LOG_LEVEL: 'silent' } }));
vi.mock('../../src/image/cleanup-verifier.js', () => ({ findResidualText: vi.fn() }));
vi.mock('../../src/image/ai-text-removal.js', () => ({ removeTextWithAi: vi.fn(), aiFallbackAvailable: vi.fn() }));

const verifier = await import('../../src/image/cleanup-verifier.js');
const ai = await import('../../src/image/ai-text-removal.js');
const { verifyAndRepair } = await import('../../src/image/region-repair.js');

const bbox = { x: 1, y: 1, width: 10, height: 5 };
const cleaned = { kind: 'cleaned' as const, method: 'solid-color-fill' as const, quality: 'good' as const, buffer: Buffer.from('cleaned'), textColor: null };
const base = { originalBuffer: Buffer.from('original'), previousBuffer: Buffer.from('previous'), bbox, width: 20, height: 20 };
const clean = { checked: true, residual: false, texts: [] };
const residual = { checked: true, residual: true, texts: ['남음'] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ai.aiFallbackAvailable).mockReturnValue(true);
});

describe('verifyAndRepair', () => {
  it('정리 후 글자가 안 남았으면 그대로 통과한다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValue(clean);
    expect(await verifyAndRepair({ ...base, outcome: cleaned })).toMatchObject({ kind: 'cleaned', method: 'solid-color-fill', residualText: false });
    expect(ai.removeTextWithAi).not.toHaveBeenCalled();
  });

  it('검증을 하지 못했으면(checked=false) 통과로 취급한다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValue({ checked: false, residual: false, texts: [] });
    expect(await verifyAndRepair({ ...base, outcome: cleaned })).toMatchObject({ residualText: false });
  });

  it('글자가 남았고 AI 폴백이 성공하면 AI 결과로 교체한다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValueOnce(residual).mockResolvedValueOnce(clean);
    vi.mocked(ai.removeTextWithAi).mockResolvedValue(Buffer.from('ai'));
    const result = await verifyAndRepair({ ...base, outcome: cleaned });
    expect(result).toMatchObject({ kind: 'cleaned', method: 'ai-inpaint', quality: 'acceptable', residualText: false });
    // 훼손되기 전의 원본에서 지우고, 앞선 영역 정리 결과 위에 얹는다.
    expect(ai.removeTextWithAi).toHaveBeenCalledWith(base.originalBuffer, base.previousBuffer, bbox, 20, 20);
  });

  it('AI 폴백이 꺼져 있거나 실패하면 글자가 남았다는 표시(residualText)와 low 품질로 돌려준다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValue(residual);
    vi.mocked(ai.removeTextWithAi).mockResolvedValue(null);
    expect(await verifyAndRepair({ ...base, outcome: cleaned })).toMatchObject({ kind: 'cleaned', method: 'solid-color-fill', quality: 'low', residualText: true });
  });

  it('AI 결과에도 글자가 남으면 그 결과를 쓰지 않는다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValue(residual);
    vi.mocked(ai.removeTextWithAi).mockResolvedValue(Buffer.from('ai'));
    expect(await verifyAndRepair({ ...base, outcome: cleaned })).toMatchObject({ method: 'solid-color-fill', residualText: true });
  });

  it('자동 정리를 포기한 무늬 배경은 AI 폴백으로 지운다', async () => {
    vi.mocked(verifier.findResidualText).mockResolvedValue(clean);
    vi.mocked(ai.removeTextWithAi).mockResolvedValue(Buffer.from('ai'));
    const result = await verifyAndRepair({ ...base, outcome: { kind: 'manual', reason: 'periodic-pattern', textColor: null } });
    expect(result).toMatchObject({ kind: 'cleaned', method: 'ai-inpaint' });
  });

  it('위치가 불확실한 영역(검수 대상 복잡 배경)은 AI로도 지우지 않는다', async () => {
    const manual = { kind: 'manual' as const, reason: 'review-complex-background' as const, textColor: null };
    expect(await verifyAndRepair({ ...base, outcome: manual })).toBe(manual);
    expect(ai.removeTextWithAi).not.toHaveBeenCalled();
  });

  it('AI 폴백이 꺼져 있으면 수동 전환을 그대로 돌려준다', async () => {
    vi.mocked(ai.aiFallbackAvailable).mockReturnValue(false);
    const manual = { kind: 'manual' as const, reason: 'periodic-pattern' as const, textColor: null };
    expect(await verifyAndRepair({ ...base, outcome: manual })).toBe(manual);
    expect(ai.removeTextWithAi).not.toHaveBeenCalled();
  });
});
