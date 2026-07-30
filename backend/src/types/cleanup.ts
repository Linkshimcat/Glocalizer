export type CleanupMethod = 'transparent-mask' | 'solid-color-fill' | 'directional-inpaint' | 'blur-mask' | 'manual-required';
export type CleanupQuality = 'good' | 'acceptable' | 'low';

export interface CleanupResult {
  method: CleanupMethod;
  quality: CleanupQuality;
  needsManualCleanup: boolean;
  cleanedImagePath?: string;
}
