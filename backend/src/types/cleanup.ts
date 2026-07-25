export type CleanupMethod = 'transparent-mask' | 'solid-color-fill' | 'directional-inpaint' | 'manual-required';
export type CleanupQuality = 'good' | 'acceptable' | 'low';

export interface CleanupResult {
  method: CleanupMethod;
  quality: CleanupQuality;
  needsManualCleanup: boolean;
  cleanedImagePath?: string;
}
