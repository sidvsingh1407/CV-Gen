import { describe, it, expect } from 'vitest';
import { renderDocument } from '../index';
import { CvDraftOutput } from '@/lib/schemas/cvDraft';
import { FactCheckResult } from '@/lib/schemas/factCheck';

const minimalDraft: CvDraftOutput = {
  schemaVersion: 1,
  status: 'draft_ready',
  targetRole: null,
  header: null,
  sections: [],
  warnings: [],
};

const passedFactCheck: FactCheckResult = {
  schemaVersion: 1,
  status: 'passed',
  claimsChecked: 0,
  supportedCount: 0,
  partialCount: 0,
  unsupportedCount: 0,
  uncertainCount: 0,
  blockingIssueCount: 0,
  issues: [],
  warnings: [],
};

const blockedFactCheck: FactCheckResult = {
  ...passedFactCheck,
  status: 'blocked',
};

describe('renderDocument entry point', () => {
  it('should allow export if fact check is passed', async () => {
    const result = await renderDocument({ draft: minimalDraft, format: 'docx' }, passedFactCheck);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.contentType).toContain('wordprocessingml.document');
  });

  it('should reject export if fact check is not passed', async () => {
    await expect(renderDocument({ draft: minimalDraft, format: 'docx' }, blockedFactCheck)).rejects.toThrow('Fact check status is: blocked');
  });
});
