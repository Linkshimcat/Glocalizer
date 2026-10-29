import { describe, expect, it } from 'vitest';
import { inspectSpec } from '../../src/qa/spec-rules.js';
import { findingFor, jpegImage, noisyPng, opaquePng, stickerPng } from '../helpers/qa-fixtures.js';

const ID = 'asset-1';

describe('inspectSpec', () => {
  it('규격을 지킨 스티커는 다섯 항목 모두 pass다', async () => {
    const findings = await inspectSpec(ID, await stickerPng());
    expect(findings.map((f) => [f.code, f.severity])).toEqual([
      ['SPEC_FORMAT', 'pass'],
      ['SPEC_FILE_SIZE', 'pass'],
      ['SPEC_DIMENSIONS', 'pass'],
      ['SPEC_TRANSPARENCY', 'pass'],
      ['SPEC_MARGIN', 'pass'],
    ]);
    expect(findings.every((f) => f.source === 'rule' && f.imageId === ID)).toBe(true);
  });

  it('JPEG는 파일 이름이 .png여도 SPEC_FORMAT fail이다 (확장자가 아니라 실제 포맷을 읽는다)', async () => {
    const findings = await inspectSpec(ID, await jpegImage());
    expect(findingFor(findings, 'SPEC_FORMAT')).toMatchObject({ severity: 'fail', measuredValue: 'jpeg' });
  });

  it('1 MB를 넘는 PNG는 SPEC_FILE_SIZE fail이고 실측 바이트를 담는다', async () => {
    const buffer = await noisyPng();
    const finding = findingFor(await inspectSpec(ID, buffer), 'SPEC_FILE_SIZE');
    expect(finding.severity).toBe('fail');
    expect(finding.measuredValue).toBe(buffer.length);
    expect(finding.criterion).toBe('≤ 1 MB');
  });

  it.each([
    [1_048_576, 'pass'], // 정확히 1 MB는 "1 MB 이하"에 든다
    [1_048_577, 'fail'],
  ] as const)('파일 크기 %i바이트는 SPEC_FILE_SIZE %s', async (bytes, severity) => {
    const png = await stickerPng();
    // PNG 디코더는 IEND 뒤의 바이트를 읽지 않으므로 뒤에 0을 채워 크기를 정확히 맞춘다.
    const padded = Buffer.concat([png, Buffer.alloc(bytes - png.length)]);
    expect(padded.length).toBe(bytes);
    expect(findingFor(await inspectSpec(ID, padded), 'SPEC_FILE_SIZE').severity).toBe(severity);
  });

  it.each([
    [240, 240, 'pass'],
    [740, 640, 'pass'],
    [96, 74, 'pass'],
    [741, 640, 'fail'],
    [640, 740, 'fail'],
    [512, 512, 'fail'],
  ] as const)('%i×%i 크기는 SPEC_DIMENSIONS %s', async (width, height, severity) => {
    const finding = findingFor(await inspectSpec(ID, await stickerPng({ width, height, left: 4, top: 4, blockWidth: width - 8, blockHeight: height - 8 })), 'SPEC_DIMENSIONS');
    expect(finding.severity).toBe(severity);
    expect(finding.measuredValue).toBe(`${width}×${height}`);
  });

  it('불투명 배경은 SPEC_TRANSPARENCY fail이고, 캐릭터 영역을 못 가르므로 SPEC_MARGIN은 review다', async () => {
    const findings = await inspectSpec(ID, await opaquePng());
    expect(findingFor(findings, 'SPEC_TRANSPARENCY').severity).toBe('fail');
    expect(findingFor(findings, 'SPEC_MARGIN')).toMatchObject({ severity: 'review' });
  });

  it.each([
    [25, 'review'], // 25/640 = 3.9% < 4%
    [26, 'pass'], //   26/640 = 4.06% ≥ 4%
  ] as const)('왼쪽 여백 %ipx는 SPEC_MARGIN %s (짧은 변 대비 4%% 경계)', async (left, severity) => {
    const png = await stickerPng({ left, top: 200, blockWidth: 300, blockHeight: 200 });
    expect(findingFor(await inspectSpec(ID, png), 'SPEC_MARGIN').severity).toBe(severity);
  });

  it('캐릭터가 가장자리에 붙어 있으면 SPEC_MARGIN review다', async () => {
    const png = await stickerPng({ left: 0, top: 70, blockWidth: 300, blockHeight: 200 });
    const finding = findingFor(await inspectSpec(ID, png), 'SPEC_MARGIN');
    expect(finding.severity).toBe('review');
    expect(finding.measuredValue).toBe(0);
  });

  it('디코딩할 수 없는 파일은 항목을 추측하지 않고 IMAGE_LOAD_FAILED 하나만 낸다', async () => {
    const findings = await inspectSpec(ID, Buffer.from('this is not an image'));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: 'IMAGE_LOAD_FAILED', severity: 'fail', source: 'rule', imageId: ID });
  });
});
