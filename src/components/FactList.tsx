'use client';

import { useState } from 'react';
import { FactKind } from '@prisma/client';
import { profileApi } from '@/lib/api/client';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { FactForm } from './FactForm';

export function FactList({
  entryId,
  facts,
  onUpdate,
}: {
  entryId: string;
  facts: Record<string, unknown>[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fact?')) {
      try {
        await profileApi.deleteFact(id);
        onUpdate();
      } catch (err) {
        alert((err as Error).message || 'Failed to delete fact');
      }
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-gray-700">Facts</h5>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Fact
        </button>
      </div>

      <div className="space-y-3">
        {facts.map((fact) => (
          <div key={fact.id as string} className="bg-white border rounded p-3 text-sm">
            {editingId === fact.id ? (
              <FactForm
                entryId={entryId}
                initialData={fact}
                onCancel={() => setEditingId(null)}
                onSave={() => {
                  setEditingId(null);
                  onUpdate();
                }}
              />
            ) : (
              <div className="flex justify-between items-start">
                <div className="space-y-1 w-full pr-4">
                  <div className="flex items-start">
                    <span className="text-gray-800 flex-1">{fact.text as string}</span>
                    {fact.kind === FactKind.locked_number && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 whitespace-nowrap">
                        Locked Number
                      </span>
                    )}
                  </div>

                  {fact.evidenceNote ? (
                    <p className="text-xs text-gray-500 italic">Evidence: {fact.evidenceNote as string}</p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      No evidence supplied
                    </p>
                  )}
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(fact.id as string)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fact.id as string)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="bg-white border rounded p-3 text-sm">
            <FactForm
              entryId={entryId}
              onCancel={() => setIsAdding(false)}
              onSave={() => {
                setIsAdding(false);
                onUpdate();
              }}
            />
          </div>
        )}

        {facts.length === 0 && !isAdding && (
          <p className="text-xs text-gray-500 italic">No facts added yet.</p>
        )}
      </div>
    </div>
  );
}
