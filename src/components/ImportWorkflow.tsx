'use client'

import React, { useState, useRef } from 'react'
import { profileApi, ApiError } from '@/lib/api/client'
import { AlertCircle, Upload, Check, X } from 'lucide-react'
import { EntryType, FactKind, Visibility } from '@prisma/client'

interface ImportWorkflowProps {
  onImportComplete: () => void
}

export function ImportWorkflow({ onImportComplete }: ImportWorkflowProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<any | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const response = await profileApi.importCv(file)
      setDraft(response.draftProfile)
      setSelectedEntries(new Set(response.draftProfile.entries.map((_: any, i: number) => i)))
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication is not implemented yet. Import is unavailable.')
      } else {
        setError((err as Error).message || 'Failed to upload and parse CV.')
      }
    } finally {
      setUploading(false)
    }
  }

  const handleToggleEntry = (index: number) => {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedEntries(newSelected)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      // Create entries
      for (const [index, entry] of draft.entries.entries()) {
        if (!selectedEntries.has(index)) continue

        const newEntry = await profileApi.createEntry({
          type: entry.type,
          title: entry.title,
          organization: entry.organization,
          start: entry.start,
          end: entry.end,
          visibility: Visibility.always,
          displayOrder: entry.displayOrder,
        })

        if (entry.facts && entry.facts.length > 0) {
          for (const fact of entry.facts) {
            await profileApi.createFact(newEntry.id, {
              text: fact.text,
              kind: FactKind.free_text,
            })
          }
        }
      }

      setDraft(null)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onImportComplete()
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication is not implemented yet. Cannot save imported data.')
      } else {
        setError((err as Error).message || 'Failed to save imported entries.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (draft) {
    return (
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Review Draft Profile</h3>
        <p className="text-gray-600">
          Please review the extracted information. Uncheck any entries you do not want to import.
          This will not overwrite your existing profile fields unless you explicitly save.
        </p>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {draft.entries.map((entry: any, index: number) => (
            <div
              key={index}
              className={`border rounded-lg p-4 flex items-start space-x-4 ${selectedEntries.has(index) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                checked={selectedEntries.has(index)}
                onChange={() => handleToggleEntry(index)}
                aria-label={`Select entry ${entry.title}`}
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{entry.title}</h4>
                {entry.organization && (
                  <p className="text-sm text-gray-600">{entry.organization}</p>
                )}
                <div className="text-sm text-gray-500 space-x-2">
                  <span className="uppercase tracking-wider font-semibold text-xs text-gray-400">
                    {entry.type}
                  </span>
                  <span>•</span>
                  <span>
                    {entry.start || 'Unknown'} - {entry.end || 'Unknown'}
                  </span>
                </div>
                {entry.facts && entry.facts.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                    {entry.facts.map((fact: any, fIndex: number) => (
                      <li key={fIndex}>{fact.text}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {draft.entries.length === 0 && (
            <p className="text-gray-500 italic">No structured entries could be extracted.</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={() => setDraft(null)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedEntries.size === 0}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : `Import ${selectedEntries.size} Entries`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Import CV</h3>
        <p className="text-sm text-gray-500">
          Upload a PDF or DOCX file to automatically extract experiences and education.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF or DOCX (Max 10MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={uploading}
            data-testid="file-upload"
            ref={fileInputRef}
          />
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
          <div className="flex items-center space-x-2 truncate">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
            <span className="text-xs text-gray-500">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-gray-400 hover:text-red-500 focus:outline-none"
            title="Remove file"
            disabled={uploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
        >
          {uploading ? 'Processing...' : 'Upload & Parse'}
        </button>
      </div>
    </div>
  )
}
