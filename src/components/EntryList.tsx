'use client';

import { useState } from 'react';
import { EntryType, Visibility } from '@prisma/client';
import { profileApi } from '@/lib/api/client';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { EntryForm } from './EntryForm';
import { FactList } from './FactList';

interface Entry {
  id: string;
  type: EntryType;
  title: string;
  organization?: string | null;
  start?: string | null;
  end?: string | null;
  visibility: Visibility;
  placement?: string | null;
  displayOrder: number;
  facts: Record<string, unknown>[];
}

export function EntryList({
  entries,
  onUpdate,
}: {
  entries: Entry[];
  onUpdate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<EntryType | null>(null);

  const groups: Record<EntryType, Entry[]> = entries.reduce(
    (acc, entry) => {
      acc[entry.type] = acc[entry.type] || [];
      acc[entry.type].push(entry);
      return acc;
    },
    {} as Record<EntryType, Entry[]>
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry? This may also delete its associated facts.')) {
      try {
        await profileApi.deleteEntry(id);
        onUpdate();
      } catch (err) {
        alert((err as Error).message || 'Failed to delete entry');
      }
    }
  };

  const groupLabels: Record<EntryType, string> = {
    [EntryType.experience]: 'Experience',
    [EntryType.project]: 'Projects',
    [EntryType.freelance]: 'Freelance',
    [EntryType.education]: 'Education',
    [EntryType.certification]: 'Certifications',
    [EntryType.skill]: 'Skills',
    [EntryType.position]: 'Positions of Responsibility',
    [EntryType.volunteer]: 'Volunteering',
    [EntryType.award]: 'Awards',
  };

  return (
    <div className="space-y-8">
      {Object.values(EntryType).map((type) => (
        <div key={type} className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-800">{groupLabels[type]}</h3>
            <button
              onClick={() => setIsAdding(type)}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add {groupLabels[type]}
            </button>
          </div>

          {isAdding === type && (
            <div className="mb-6 p-4 border rounded-md bg-gray-50">
              <h4 className="text-md font-medium mb-4">New {groupLabels[type]}</h4>
              <EntryForm
                type={type}
                onCancel={() => setIsAdding(null)}
                onSave={() => {
                  setIsAdding(null);
                  onUpdate();
                }}
              />
            </div>
          )}

          <div className="space-y-4">
            {(groups[type] || []).map((entry) => (
              <div key={entry.id} className="border rounded-md p-4 bg-gray-50">
                {editingId === entry.id ? (
                  <EntryForm
                    type={type}
                    initialData={entry as unknown as Record<string, unknown>}
                    onCancel={() => setEditingId(null)}
                    onSave={() => {
                      setEditingId(null);
                      onUpdate();
                    }}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{entry.title}</h4>
                        {entry.organization && <p className="text-sm text-gray-600">{entry.organization}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.start ? entry.start : ''} {entry.start && entry.end ? ' - ' : ''} {entry.end ? entry.end : ''}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingId(entry.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <FactList entryId={entry.id} facts={entry.facts} onUpdate={onUpdate} />
                  </div>
                )}
              </div>
            ))}

            {(!groups[type] || groups[type].length === 0) && !isAdding && (
              <p className="text-sm text-gray-500 italic py-2">No {groupLabels[type].toLowerCase()} entries added yet.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
