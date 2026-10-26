'use client'

import { useEffect, useState } from 'react'
import { profileApi, ApiError } from '@/lib/api/client'
import { AlertCircle } from 'lucide-react'
import { ProfileHeaderForm } from '@/components/ProfileHeaderForm'
import { EntryList } from '@/components/EntryList'
import { EducationSettings } from '@/components/EducationSettings'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        const data = await profileApi.getProfile()
        if (isMounted) setProfile(data)
      } catch (err: unknown) {
        if (!isMounted) return

        if (err instanceof ApiError && err.status === 401) {
          setError('Authentication is not implemented yet. Profile access is unavailable.')
        } else {
          setError((err as Error).message || 'Failed to load profile.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleUpdate = async () => {
    try {
      const data = await profileApi.getProfile()
      setProfile(data)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Authentication is not implemented yet. Profile access is unavailable.')
      } else {
        setError((err as Error).message || 'Failed to load profile.')
      }
    }
  }

  const calculateCompletion = () => {
    if (!profile) return 0
    let completed = 0
    const total = 5

    if (profile.header && (profile.header as Record<string, unknown>).fullName) completed++
    if (profile.header && (profile.header as Record<string, unknown>).email) completed++

    const entries = profile.entries as Record<string, unknown>[] | undefined
    if (entries) {
      if (entries.filter((e) => e.type === 'experience').length > 0) completed++
      if (entries.filter((e) => e.type === 'education').length > 0) completed++
      if (entries.filter((e) => e.type === 'skill').length > 0) completed++
    }

    return Math.round((completed / total) * 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8 sm:p-20 font-[family-name:var(--font-geist-sans)] text-gray-900">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Master Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your career facts and single source of truth for future CV generation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading profile...</div>
        ) : profile ? (
          <div className="space-y-8">
            <div className="bg-white shadow rounded-lg p-6 flex justify-between items-center">
              <span className="font-semibold text-gray-700">Profile Completion:</span>
              <span className="text-blue-600 font-bold">{calculateCompletion()}%</span>
            </div>
            <ProfileHeaderForm initialData={profile.header as Record<string, unknown>} />
            <EducationSettings initialShowMarks={(profile.showMarks as boolean) || false} />
            <EntryList entries={(profile.entries as never) || []} onUpdate={handleUpdate} />
          </div>
        ) : (
          !error && <div className="text-gray-500">No profile data available.</div>
        )}
      </div>
    </div>
  )
}
