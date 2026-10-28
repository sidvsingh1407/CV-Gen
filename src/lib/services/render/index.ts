import { CvDraftOutput } from '@/lib/schemas/cvDraft';
import { FactCheckResult } from '@/lib/schemas/factCheck';
import { RenderRequest } from './types';
import { generateDocx } from './docx';
import { convertDocxToPdf } from './pdf';

export async function renderDocument(
  request: RenderRequest,
  factCheckResult: FactCheckResult
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {

  if (factCheckResult.status !== 'passed') {
    throw new Error(`Cannot export document. Fact check status is: ${factCheckResult.status}`);
  }

  const docxBuffer = await generateDocx(request.draft);

  if (request.format === 'docx') {
    return {
      buffer: docxBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'resume.docx',
    };
  } else if (request.format === 'pdf') {
    const pdfBuffer = await convertDocxToPdf(docxBuffer);
    return {
      buffer: pdfBuffer,
      contentType: 'application/pdf',
      filename: 'resume.pdf',
    };
  }

  throw new Error(`Unsupported format: ${request.format}`);
}
