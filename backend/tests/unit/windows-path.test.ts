import { describe, expect, it } from 'vitest';
import { toWindowsPath } from '../../src/ocr/openvino/windows-path.js';

describe('toWindowsPath', () => {
  it('converts a WSL mounted drive path for the Windows NPU bridge', () => {
    expect(toWindowsPath('/mnt/d/web_project/projects/Glocalizer/backend/python/windows_openvino_ocr.py')).toBe('D:/web_project/projects/Glocalizer/backend/python/windows_openvino_ocr.py');
  });

  it('rejects a path that Windows cannot access through the mounted workspace', () => {
    expect(() => toWindowsPath('/home/gunt/model.onnx')).toThrow('/mnt/<drive>/');
  });
});
