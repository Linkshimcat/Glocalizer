import { describe, expect, it } from 'vitest';
import { maskIp, parseDeviceLabel } from '../../src/utils/device-info.js';

describe('parseDeviceLabel', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'Chrome · macOS'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'Safari · macOS'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'Safari · iOS'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1', 'Chrome · iOS'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0', 'Edge · Windows'],
    ['Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', 'Samsung Internet · Android'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 'Firefox · Linux'],
  ])('labels %s', (ua, label) => expect(parseDeviceLabel(ua)).toBe(label));

  it('returns null when nothing is recognised', () => {
    expect(parseDeviceLabel(undefined)).toBeNull();
    expect(parseDeviceLabel('curl/8.0')).toBeNull();
  });
});

describe('maskIp', () => {
  it('keeps only the first three IPv4 octets', () => {
    expect(maskIp('203.0.113.42')).toBe('203.0.113.x');
    expect(maskIp('::ffff:203.0.113.42')).toBe('203.0.113.x');
  });

  it('keeps only the first three IPv6 groups', () => {
    expect(maskIp('2001:db8:85a3:0:0:8a2e:370:7334')).toBe('2001:db8:85a3::');
    expect(maskIp('2001:db8::1')).toBe('2001:db8:0::');
    expect(maskIp('::1')).toBe('0:0:0::');
  });

  it('does not store anything for missing or invalid input', () => {
    expect(maskIp(undefined)).toBeNull();
    expect(maskIp('not-an-ip')).toBeNull();
  });
});
