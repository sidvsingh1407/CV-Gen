'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  preferencesSchema,
  SUPPORTED_SECTIONS,
  TONE_PRESETS,
  PAGE_MODES,
  LINK_FORMATS,
} from '@/lib/schemas/preferences'
import { preferencesApi, ApiError } from '@/lib/api/client'
import { z } from 'zod'

// Use a simplified schema type for RHF to avoid deep merging issues with default values and Zod transforms
type PreferencesForm = z.input<typeof preferencesSchema>

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      version: 1,
      sectionOrder: [...SUPPORTED_SECTIONS],
      excludedEntryIds: [],
      tone: 'professional',
      pageMode: 'two_page',
      formatting: {
        fontFamily: 'Arial',
        primaryColor: '#1B3A6B',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        linkFormat: 'anchor_text',
      },
      bannedCharacters: [],
      fitThreshold: 70,
    },
  })

  // We construct the fields array directly from watched state for simple reordering
  const sectionOrder = watch('sectionOrder')

  const moveSection = (index: number, newIndex: number) => {
    if (!sectionOrder || newIndex < 0 || newIndex >= sectionOrder.length) return
    const newOrder = [...sectionOrder]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(newIndex, 0, moved)
    setValue('sectionOrder', newOrder as any, { shouldValidate: true })
  }

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const data = await preferencesApi.getPreferences()
        reset(data)
        setError(null)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError('Preferences are unavailable until authentication is implemented.')
        } else {
          setError('Failed to load preferences.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [reset])

  const onSubmit: SubmitHandler<PreferencesForm> = async (data) => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await preferencesApi.updatePreferences(data)
      reset(updated)
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Preferences are unavailable until authentication is implemented.')
      } else {
        setError('Failed to save preferences.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    )
  }

  if (error && error.includes('authentication is implemented')) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 sm:p-20 font-[family-name:var(--font-geist-sans)] text-gray-900">
        <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <h1 className="text-3xl font-bold">Preferences</h1>
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 sm:p-20 font-[family-name:var(--font-geist-sans)] text-gray-900">
      <main className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Preferences</h1>
          <p className="mt-2 text-gray-600">Configure how your CV is generated.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div
            className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200"
            role="alert"
          >
            Preferences saved successfully.
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 rounded-lg shadow-sm border border-gray-100"
        >
          {/* Section Ordering */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Section Order</h2>
            <p className="text-sm text-gray-500">Adjust the order of sections in your CV.</p>
            <div className="space-y-2">
              {sectionOrder?.map((section, index) => (
                <div
                  key={section}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                >
                  <span className="capitalize">{section}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveSection(index, index - 1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      aria-label={`Move ${section} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, index + 1)}
                      disabled={index === (sectionOrder.length || 0) - 1}
                      className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      aria-label={`Move ${section} down`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {errors.sectionOrder && (
              <p className="text-red-500 text-sm">{errors.sectionOrder.message as string}</p>
            )}
          </section>

          {/* Tone & Format */}
          <section className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold">Tone & Format</h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
                  Writing Tone
                </label>
                <select
                  id="tone"
                  {...register('tone')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {TONE_PRESETS.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </option>
                  ))}
                </select>
                {errors.tone && <p className="text-red-500 text-sm">{errors.tone.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Page Mode</label>
                <select
                  {...register('pageMode')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="one_page">1 Page</option>
                  <option value="two_page">2 Pages</option>
                </select>
                {errors.pageMode && (
                  <p className="text-red-500 text-sm">{errors.pageMode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Font Family</label>
                <input
                  type="text"
                  {...register('formatting.fontFamily')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.formatting?.fontFamily && (
                  <p className="text-red-500 text-sm">{errors.formatting.fontFamily.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    {...register('formatting.primaryColor')}
                    className="h-10 w-10 p-1 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    {...register('formatting.primaryColor')}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>
                {errors.formatting?.primaryColor && (
                  <p className="text-red-500 text-sm">{errors.formatting.primaryColor.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Link Format</label>
                <select
                  {...register('formatting.linkFormat')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="anchor_text">Anchor Text</option>
                  <option value="raw_url">Raw URL</option>
                </select>
                {errors.formatting?.linkFormat && (
                  <p className="text-red-500 text-sm">{errors.formatting.linkFormat.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Margins */}
          <section className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold">Margins</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Top</label>
                <input
                  type="number"
                  {...register('formatting.margins.top', { valueAsNumber: true })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.formatting?.margins?.top && (
                  <p className="text-red-500 text-sm">{errors.formatting.margins.top.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Bottom</label>
                <input
                  type="number"
                  {...register('formatting.margins.bottom', { valueAsNumber: true })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.formatting?.margins?.bottom && (
                  <p className="text-red-500 text-sm">{errors.formatting.margins.bottom.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Left</label>
                <input
                  type="number"
                  {...register('formatting.margins.left', { valueAsNumber: true })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.formatting?.margins?.left && (
                  <p className="text-red-500 text-sm">{errors.formatting.margins.left.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Right</label>
                <input
                  type="number"
                  {...register('formatting.margins.right', { valueAsNumber: true })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.formatting?.margins?.right && (
                  <p className="text-red-500 text-sm">{errors.formatting.margins.right.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Job Fit Threshold */}
          <section className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold">Job Fit Threshold</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  {...register('fitThreshold', { valueAsNumber: true })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-medium w-12 text-center">
                  {watch('fitThreshold')}%
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Minimum score required for automatic progression.
              </p>
              {errors.fitThreshold && (
                <p className="text-red-500 text-sm">{errors.fitThreshold.message}</p>
              )}
            </div>
          </section>

          {/* Banned Characters */}
          <section className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold">Banned Characters</h2>
            <p className="text-sm text-gray-500">
              Comma-separated characters or words to avoid in generated content.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="e.g. !, ?, etc."
                onChange={(e) => {
                  const val = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                  setValue('bannedCharacters', val as any, { shouldValidate: true })
                }}
                value={watch('bannedCharacters')?.join(', ') || ''}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.bannedCharacters && (
                <p className="text-red-500 text-sm">{errors.bannedCharacters.message as string}</p>
              )}
            </div>
          </section>

          {/* Excluded Entries (Read Only for now since no profile loading context here, usually handled per-entry) */}
          <section className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-xl font-semibold">Excluded Entries</h2>
            <p className="text-sm text-gray-500">
              Entries you have explicitly hidden from CV generation.
            </p>
            {watch('excludedEntryIds') && watch('excludedEntryIds')!.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {watch('excludedEntryIds')!.map((id: string) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No excluded entries.</p>
            )}
          </section>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
