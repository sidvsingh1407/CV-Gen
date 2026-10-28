import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx';
import { CvDraftOutput, DraftSection, DraftItem } from '@/lib/schemas/cvDraft';

const DEFAULT_FONT = 'Arial';
const DEFAULT_COLOR = '1B3A6B';
// 1 inch in TWIPs (Twentieth of an Inch Point). 1 inch = 1440 twips
const DEFAULT_MARGIN = 1440;

export async function generateDocx(draft: CvDraftOutput): Promise<Buffer> {
  const formatting = draft.formatting || {
    fontFamily: DEFAULT_FONT,
    primaryColor: `#${DEFAULT_COLOR}`,
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    linkFormat: 'anchor_text',
  };

  const fontFamily = formatting.fontFamily || DEFAULT_FONT;
  const headingColor = formatting.primaryColor ? formatting.primaryColor.replace('#', '') : DEFAULT_COLOR;

  const margins = {
    top: (formatting.margins?.top ?? 1) * 1440,
    bottom: (formatting.margins?.bottom ?? 1) * 1440,
    left: (formatting.margins?.left ?? 1) * 1440,
    right: (formatting.margins?.right ?? 1) * 1440,
  };

  const children: any[] = [];

  // Header
  if (draft.header) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: draft.header.fullName,
            bold: true,
            size: 32, // 16pt
            font: fontFamily,
            color: headingColor,
          }),
        ],
      })
    );

    const contactParts = [];
    if (draft.header.email) contactParts.push(draft.header.email);
    if (draft.header.phone) contactParts.push(draft.header.phone);
    if (draft.header.linkedin) contactParts.push(draft.header.linkedin);
    if (draft.header.portfolio) contactParts.push(draft.header.portfolio);
    if (draft.header.github) contactParts.push(draft.header.github);

    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: contactParts.join(' | '),
              size: 20, // 10pt
              font: fontFamily,
            }),
          ],
        })
      );
    }

    // Target Role if present
    if (draft.targetRole) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          children: [
            new TextRun({
              text: draft.targetRole,
              italics: true,
              size: 24, // 12pt
              font: fontFamily,
            }),
          ],
        })
      );
    }
  }

  // Sections
  for (const section of draft.sections) {
    if (section.items.length === 0) continue;

    // Section Heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: section.heading.toUpperCase(),
            bold: true,
            size: 24,
            font: fontFamily,
            color: headingColor,
          }),
        ],
      })
    );

    // Items
    for (const item of section.items) {
      // For skills or short items without title/org, just render the text
      if (!item.title && !item.organization && !item.dateString) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: item.text,
                size: 20,
                font: fontFamily,
              }),
            ],
          })
        );
        continue;
      }

      // Title line (e.g. Software Engineer, Acme Corp | 2020 - Present)
      const titleLineChildren = [];
      if (item.title) {
        titleLineChildren.push(
          new TextRun({
            text: item.title,
            bold: true,
            size: 22,
            font: fontFamily,
          })
        );
      }
      if (item.organization) {
        titleLineChildren.push(
          new TextRun({
            text: (item.title ? ', ' : '') + item.organization,
            italics: true,
            size: 22,
            font: fontFamily,
          })
        );
      }

      const p = new Paragraph({
        spacing: { before: 120 },
        children: titleLineChildren,
      });
      children.push(p);

      // Date string if present (right aligned or on next line, here just simple line)
      if (item.dateString) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.dateString,
                italics: true,
                size: 20,
                font: fontFamily,
                color: '666666',
              })
            ]
          })
        );
      }

      if (item.text) {
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: item.text,
                size: 20,
                font: fontFamily,
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: margins,
          },
        },
        children: children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
