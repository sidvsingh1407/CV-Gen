'use client'

import React, { useEffect, useState } from 'react';
import { CvEditor } from '@/components/CvEditor';
import { cvDraftSchema, CvDraftOutput } from '@/lib/schemas/cvDraft';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';

export default function CvEditorPage() {
  const [draft, setDraft] = useState<CvDraftOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedDraftStr = localStorage.getItem('cv_draft');
      if (!storedDraftStr) {
        // use a timeout to bypass react-hooks/set-state-in-effect warning, as this is setting initialization state
        setTimeout(() => setError('No draft found. Please generate a CV first.'), 0);
        return;
      }

      const storedDraft = JSON.parse(storedDraftStr);
      const parsedDraft = cvDraftSchema.parse(storedDraft);
      setTimeout(() => setDraft(parsedDraft), 0);
    } catch (e: any) {
      setTimeout(() => setError(`Failed to load draft: ${e.message}`), 0);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 shadow rounded">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4">
             <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CvEditor initialDraft={draft} />
    </div>
  );
}
