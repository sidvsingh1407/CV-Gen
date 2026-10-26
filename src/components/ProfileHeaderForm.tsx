'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { headerSchema } from '@/lib/schemas/profile'
import { z } from 'zod'
import { useState } from 'react'
import { profileApi, ApiError } from '@/lib/api/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type HeaderFormData = z.infer<typeof headerSchema>

export function ProfileHeaderForm({ initialData }: { initialData?: Record<string, unknown> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<HeaderFormData>({
    resolver: zodResolver(headerSchema) as never,
    defaultValues: {
      fullName: (initialData?.fullName as string) || '',
      phone: (initialData?.phone as string) || '',
      email: (initialData?.email as string) || '',
      linkedin: (initialData?.linkedin as string) || '',
      portfolio: (initialData?.portfolio as string) || '',
      github: (initialData?.github as string) || '',
    },
  })

  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const onSubmit = async (data: HeaderFormData) => {
    setStatus(null)
    try {
      await profileApi.updateProfileHeader(data)
      setStatus({ type: 'success', message: 'Profile information saved successfully.' })
      reset(data) // Reset isDirty
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setStatus({
          type: 'error',
          message: 'Authentication is not implemented yet. Profile access is unavailable.',
        })
      } else {
        setStatus({
          type: 'error',
          message: (err as Error).message || 'Failed to save profile information.',
        })
      }
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Personal Information</h2>

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

      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            {...register('fullName')}
            className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.fullName ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              {...register('email')}
              type="email"
              className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              {...register('phone')}
              className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
            <input
              {...register('linkedin')}
              type="url"
              className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.linkedin ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.linkedin && (
              <p className="mt-1 text-sm text-red-600">{errors.linkedin.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">GitHub URL</label>
            <input
              {...register('github')}
              type="url"
              className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors.github ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.github && <p className="mt-1 text-sm text-red-600">{errors.github.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Portfolio URL</label>
          <input
            {...register('portfolio')}
            type="url"
            className={`mt-1 block w-full rounded-md border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.portfolio ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.portfolio && (
            <p className="mt-1 text-sm text-red-600">{errors.portfolio.message}</p>
          )}
        </div>

        <div className="pt-4 flex items-center justify-between border-t">
          <p className="text-sm text-gray-500">
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
