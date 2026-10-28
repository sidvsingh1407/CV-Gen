import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderRequestSchema } from '@/lib/services/render/types';
import { renderDocument } from '@/lib/services/render';
import { runFactCheck } from '@/lib/services/factCheck';

// Match existing API protected boundary pattern
const isAuthenticated = false;

export async function POST(req: Request) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsedRequest = renderRequestSchema.parse(body);

    // Run fact check server-side to ensure draft hasn't been maliciously modified.
    // In a real environment, we'd fetch profileEntries using the authenticated userId.
    // We emulate what fact-check/route.ts does by supplying an empty array.
    const factCheckResult = runFactCheck({
      draft: parsedRequest.draft,
      profileEntries: [], // In prod, fetch from DB
      preferences: undefined, // Type doesn't match formatting, just pass undefined
    });

    if (factCheckResult.status !== 'passed') {
      return NextResponse.json(
        {
          error: 'Export blocked by fact-check result.',
          status: factCheckResult.status,
          issues: factCheckResult.issues
        },
        { status: 403 }
      );
    }

    const { buffer, contentType, filename } = await renderDocument(parsedRequest, factCheckResult);

    // Return the file
    // Need to convert Node Buffer to standard web Blob/Uint8Array for NextResponse body
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to export document';

    // Explicitly handle LibreOffice missing gracefully
    if (errorMessage.includes('PDF conversion is currently unavailable')) {
      return NextResponse.json({ error: errorMessage }, { status: 501 }); // 501 Not Implemented
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
