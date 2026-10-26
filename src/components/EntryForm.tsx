'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entrySchema } from '@/lib/schemas/profile'
import { z } from 'zod'
import { useState } from 'react'
import { profileApi, ApiError } from '@/lib/api/client'
import { EntryType, Visibility } from '@prisma/client'
import { AlertCircle } from 'lucide-react'

type EntryFormData = z.infer<typeof entrySchema>

export function EntryForm({
  type,
  initialData,
  onCancel,
  onSave,
}: {
  type: EntryType
  initialData?: Record<string, unknown>
  onCancel: () => void
  onSave: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema) as never,
    defaultValues: {
      type,
      title: (initialData?.title as string) || '',
      organization: (initialData?.organization as string) || '',
      start: (initialData?.start as string) || '',
      end: (initialData?.end as string) || '',
      visibility: (initialData?.visibility as Visibility) || Visibility.always,
      placement: (initialData?.placement as string) || '',
      displayOrder: (initialData?.displayOrder as number) || 0,
    },
  })

  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: EntryFormData) => {
    setError(null)
    try {
      if (initialData?.id) {
        await profileApi.updateEntry(initialData.id as string, data)
      } else {
        await profileApi.createEntry(data)
      }
      onSave()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication is not implemented yet. Profile persistence is unavailable.')
      } else {
        setError((err as Error).message || 'Failed to save entry.')
      }
    }
  }

  const defaultSections = [
    'Header',
    'Summary',
    'Experience',
    'Projects',
    'Freelance Projects',
    'Certifications',
    'Education',
    'Skills',
    'Positions of Responsibility',
    'Volunteer',
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          {...register('title')}
          className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Organization (optional)</label>
        <input
          {...register('organization')}
          className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date (optional)</label>
          <input
            {...register('start')}
            placeholder="YYYY-MM"
            className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.start ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.start && <p className="mt-1 text-sm text-red-600">{errors.start.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
          <input
            {...register('end')}
            placeholder="YYYY-MM or Ongoing"
            className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.end ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.end && <p className="mt-1 text-sm text-red-600">{errors.end.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Visibility</label>
          <select
            {...register('visibility')}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={Visibility.always}>Always</option>
            <option value={Visibility.on_request}>On Request</option>
            <option value={Visibility.never}>Never</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">CV Section Placement</label>
          <select
            {...register('placement')}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">(Default)</option>
            {defaultSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Display Order</label>
          <input
            type="number"
            {...register('displayOrder', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    </form>
  )
}
