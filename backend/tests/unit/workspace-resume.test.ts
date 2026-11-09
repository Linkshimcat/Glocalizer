import { describe, expect, it } from 'vitest';
import { isProcessedProject, workspaceResumePath } from '../../../frontend/src/lib/workspaceResume';

describe('workspace resume', () => {
  it.each([[undefined, false], [null, false], ['created', false], ['processing', true], ['completed', true], ['failed', true]])('treats %s as processed: %s', (status, expected) => {
    expect(isProcessedProject(status)).toBe(expected);
  });
  it('keeps an upload-stage draft on the upload page', () => {
    expect(workspaceResumePath(undefined, false)).toBe('/localize');
    expect(workspaceResumePath('created', true)).toBe('/localize');
  });
  it('sends finished downloads to the result page and everything else to the editor', () => {
    expect(workspaceResumePath('completed', true)).toBe('/result');
    expect(workspaceResumePath('failed', true)).toBe('/result');
    expect(workspaceResumePath('completed', false)).toBe('/editor');
    expect(workspaceResumePath('processing', true)).toBe('/editor');
  });
});
