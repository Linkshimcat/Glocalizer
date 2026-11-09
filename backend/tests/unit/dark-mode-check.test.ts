import { describe, expect, it } from 'vitest';
import { contrastRatio, DARK_MODE_PREVIEW_COLOR, isTextHardToSeeInDarkMode } from '../../../frontend/src/lib/darkModeCheck';

const base = { color: '#191F28', strokeOn: false, strokeWidth: 2, strokeColor: '#FFFFFF', backgroundOn: false, backgroundColor: '#FFFFFF', backgroundOpacity: 85 };

describe('dark mode text check', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });
  it('warns about dark text with nothing behind or around it', () => {
    expect(isTextHardToSeeInDarkMode(base)).toBe(true);
  });
  it('accepts light text', () => {
    expect(isTextHardToSeeInDarkMode({ ...base, color: '#FFFFFF' })).toBe(false);
  });
  it('accepts a light stroke but not a missing or dark one', () => {
    expect(isTextHardToSeeInDarkMode({ ...base, strokeOn: true })).toBe(false);
    expect(isTextHardToSeeInDarkMode({ ...base, strokeOn: true, strokeWidth: 0 })).toBe(true);
    expect(isTextHardToSeeInDarkMode({ ...base, strokeOn: true, strokeColor: DARK_MODE_PREVIEW_COLOR })).toBe(true);
  });
  it('accepts a light background panel only when it is opaque enough', () => {
    expect(isTextHardToSeeInDarkMode({ ...base, backgroundOn: true })).toBe(false);
    expect(isTextHardToSeeInDarkMode({ ...base, backgroundOn: true, backgroundOpacity: 20 })).toBe(true);
    expect(isTextHardToSeeInDarkMode({ ...base, backgroundOn: true, backgroundColor: '#191F28' })).toBe(true);
  });
});
