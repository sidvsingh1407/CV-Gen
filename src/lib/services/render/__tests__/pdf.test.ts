import { describe, it, expect, vi } from 'vitest';
import { convertDocxToPdf } from '../pdf';
import * as pdfModule from '../pdf';
import { generateDocx } from '../docx';
import { CvDraftOutput } from '@/lib/schemas/cvDraft';

const minimalDraft: CvDraftOutput = {
  schemaVersion: 1,
  status: 'draft_ready',
  targetRole: null,
  header: null,
  sections: [],
  warnings: [],
};

describe('convertDocxToPdf', () => {
  it('should gracefully throw error if LibreOffice is missing (or report availability)', async () => {
    // If it's missing, it throws immediately. If it exists, it might run or fail in another way.
    // To isolate test without checking real environment reliably, we mock isLibreOfficeAvailable.
    vi.spyOn(pdfModule, 'isLibreOfficeAvailable').mockResolvedValue(false);

    const docxBuffer = await generateDocx(minimalDraft);
    await expect(convertDocxToPdf(docxBuffer)).rejects.toThrow('PDF conversion is currently unavailable');

    vi.restoreAllMocks();
  });
});
