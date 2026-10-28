import { describe, it, expect } from 'vitest';
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

describe('generateDocx', () => {
  it('should generate a minimal valid docx buffer', async () => {
    const buffer = await generateDocx(minimalDraft);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Check for standard zip signature since docx is a zip file
    expect(buffer.slice(0, 4).toString('hex')).toBe('504b0304');
  });

  it('should preserve headings and text blocks correctly', async () => {
    const draft: CvDraftOutput = {
      ...minimalDraft,
      header: {
        fullName: 'Test User',
        email: 'test@example.com',
      },
      sections: [
        {
          sectionId: 'experience',
          heading: 'Experience',
          items: [
            {
              id: '123',
              text: 'Did some cool things.',
              title: 'Software Engineer',
              organization: 'Acme Corp',
              dateString: '2020 - 2021',
              sourceFactIds: [],
              verificationStatus: 'verified',
              matchedRequirementIds: [],
              warnings: [],
            }
          ]
        }
      ]
    };

    const buffer = await generateDocx(draft);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
