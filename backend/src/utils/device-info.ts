import { isIPv4, isIPv6 } from 'node:net';

/** User-Agent에서 "Chrome · macOS" 같은 짧은 기기 라벨을 만든다. 알 수 없으면 null(표시 언어는 프론트가 정한다). */
export function parseDeviceLabel(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.slice(0, 255);

  const browser =
    /\bEdgA?\/|\bEdgiOS\//.test(ua) ? 'Edge'
    : /\bOPR\/|\bOpera\b/.test(ua) ? 'Opera'
    : /\bSamsungBrowser\//.test(ua) ? 'Samsung Internet'
    : /\bFirefox\/|\bFxiOS\//.test(ua) ? 'Firefox'
    : /\bNAVER\(|\bNaver\b/.test(ua) ? 'Naver'
    : /\bChrome\/|\bCriOS\//.test(ua) ? 'Chrome'
    : /\bSafari\//.test(ua) && /\bVersion\//.test(ua) ? 'Safari'
    : null;

  const os =
    /\biPhone\b/.test(ua) ? 'iOS'
    : /\biPad\b/.test(ua) ? 'iPadOS'
    : /\bAndroid\b/.test(ua) ? 'Android'
    : /\bWindows\b/.test(ua) ? 'Windows'
    : /\bCrOS\b/.test(ua) ? 'ChromeOS'
    : /\bMac OS X\b|\bMacintosh\b/.test(ua) ? 'macOS'
    : /\bLinux\b/.test(ua) ? 'Linux'
    : null;

  if (browser && os) return `${browser} · ${os}`;
  return browser ?? os;
}

/** IP를 식별은 어렵게 하고 기기 구분에는 충분한 수준으로 가린다.
 *  IPv4는 마지막 옥텟(203.0.113.x), IPv6는 앞 3그룹(/48)만 남긴다. */
export function maskIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  const address = mapped ? mapped[1] : ip;

  if (isIPv4(address)) return `${address.split('.').slice(0, 3).join('.')}.x`;
  if (isIPv6(address)) {
    const [head, tail] = address.split('::');
    const headGroups = head ? head.split(':') : [];
    const tailGroups = tail !== undefined && tail ? tail.split(':') : [];
    const missing = tail === undefined ? 0 : 8 - headGroups.length - tailGroups.length;
    const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups];
    return `${groups.slice(0, 3).map((group) => group.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::`;
  }
  return null;
}
