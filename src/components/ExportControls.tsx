import React, { useState } from 'react';
import { CvDraftOutput } from '@/lib/schemas/cvDraft';
import { Button } from './Button';

export interface ExportControlsProps {
  draft: CvDraftOutput;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ draft }) => {
  const [loadingFormat, setLoadingFormat] = useState<'docx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: 'docx' | 'pdf') => {
    setLoadingFormat(format);
    setError(null);
    try {
      const res = await fetch('/api/cv/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draft, format }),
      });

      if (!res.ok) {
        let msg = `Export failed: ${res.statusText}`;
        try {
          const body = await res.json();
          if (body.error) {
            msg = body.error;
          }
        } catch (e) {
          // Ignore json parse error
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during export.');
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded shadow-sm bg-gray-50 flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-800">Export Document</h3>

      <div className="flex gap-4">
        <Button
          onClick={() => handleExport('docx')}
          disabled={loadingFormat !== null}
        >
          {loadingFormat === 'docx' ? 'Exporting...' : 'Export DOCX'}
        </Button>
        <Button
          onClick={() => handleExport('pdf')}
          disabled={loadingFormat !== null}
          variant="outline"
        >
          {loadingFormat === 'pdf' ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};
