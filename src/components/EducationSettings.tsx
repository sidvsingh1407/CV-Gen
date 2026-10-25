'use client';

import { useState } from 'react';
import { profileApi, ApiError } from '@/lib/api/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function EducationSettings({
  initialShowMarks,
}: {
  initialShowMarks: boolean;
}) {
  const [showMarks, setShowMarks] = useState(initialShowMarks);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    const newValue = !showMarks;
    setShowMarks(newValue);
    setStatus(null);
    setIsSaving(true);

    try {
      await profileApi.updateEducationSettings(newValue);
      setStatus({ type: 'success', message: 'Education settings saved successfully.' });
    } catch (err) {
      setShowMarks(!newValue); // Revert
      if (err instanceof ApiError && err.status === 401) {
        setStatus({
          type: 'error',
          message: 'Authentication is not implemented yet. Profile access is unavailable.',
        });
      } else {
        setStatus({ type: 'error', message: (err as Error).message || 'Failed to update settings.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Education Settings</h2>

      {status?.type === 'success' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 flex items-start">
          <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-green-700">{status.message}</p>
        </div>
      )}

      {status?.type === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700">{status.message}</p>
        </div>
      )}

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="showMarks"
            name="showMarks"
            type="checkbox"
            checked={showMarks}
            onChange={handleToggle}
            disabled={isSaving}
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="showMarks" className="font-medium text-gray-700">
            Show Marks
          </label>
          <p className="text-gray-500">
            Enable this to automatically include marks and grades in your generated CVs.
            Disabling this will omit marks during future CV generation.
          </p>
        </div>
      </div>
    </div>
  );
}
