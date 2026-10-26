'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { factSchema } from '@/lib/schemas/profile'
import { z } from 'zod'
import { useState } from 'react'
import { profileApi, ApiError } from '@/lib/api/client'
import { FactKind } from '@prisma/client'
import { AlertCircle } from 'lucide-react'

type FactFormData = z.infer<typeof factSchema>

export function FactForm({
  entryId,
  initialData,
  onCancel,
  onSave,
}: {
  entryId: string
  initialData?: Record<string, unknown>
  onCancel: () => void
  onSave: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FactFormData>({
    resolver: zodResolver(factSchema) as never,
    defaultValues: {
      text: (initialData?.text as string) || '',
      kind: (initialData?.kind as FactKind) || FactKind.free_text,
      evidenceNote: (initialData?.evidenceNote as string) || '',
    },
  })

  const [error, setError] = useState<string | null>(null)

  const kind = watch('kind')
  const isLocked = initialData?.kind === FactKind.locked_number

  const onSubmit = async (data: FactFormData) => {
    setError(null)
    try {
      if (initialData?.id) {
        await profileApi.updateFact(initialData.id as string, data)
      } else {
        await profileApi.createFact(entryId, data)
      }
      onSave()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication is not implemented yet. Profile persistence is unavailable.')
      } else {
        setError((err as Error).message || 'Failed to save fact.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-3">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-2 mb-2 flex items-start">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700">Fact Text</label>
        <textarea
          {...register('text')}
          disabled={isLocked && !!initialData}
          className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs ${
            errors.text ? 'border-red-300' : 'border-gray-300'
          } ${isLocked && !!initialData ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          rows={2}
        />
        {errors.text && <p className="mt-1 text-xs text-red-600">{errors.text.message}</p>}
        {isLocked && !!initialData && (
          <p className="mt-1 text-xs text-blue-600">
            This is a locked number fact. Its original text must be preserved exactly.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">Fact Kind</label>
          <select
            {...register('kind')}
            disabled={isLocked && !!initialData}
            className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs ${
              isLocked && !!initialData
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : 'border-gray-300'
            }`}
          >
            <option value={FactKind.free_text}>Free Text</option>
            <option value={FactKind.locked_number}>Locked Number</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Evidence Note (Optional)
          </label>
          <input
            {...register('evidenceNote')}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs"
            placeholder="e.g. Contract, Certificate link..."
          />
        </div>
      </div>

      {kind === FactKind.locked_number && !initialData && (
        <p className="text-xs text-blue-600 italic">
          Locked numbers cannot have their text altered after being created to preserve verifiable
          accuracy.
        </p>
      )}

      <div className="pt-2 flex items-center justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white py-1 px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-1 px-3 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
