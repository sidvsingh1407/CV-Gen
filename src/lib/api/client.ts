export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errorData.error || res.statusText || 'An error occurred')
  }

  return res.json()
}

export const profileApi = {
  getProfile: () => fetchApi('/api/profile'),
  updateProfileHeader: (data: unknown) =>
    fetchApi('/api/profile', { method: 'PATCH', body: JSON.stringify({ header: data }) }),
  updateEducationSettings: (showMarks: boolean) =>
    fetchApi('/api/profile', { method: 'PATCH', body: JSON.stringify({ showMarks }) }),

  getEntries: () => fetchApi('/api/entries'),
  createEntry: (data: unknown) =>
    fetchApi('/api/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: string, data: unknown) =>
    fetchApi(`/api/entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEntry: (id: string) => fetchApi(`/api/entries/${id}`, { method: 'DELETE' }),

  createFact: (entryId: string, data: unknown) =>
    fetchApi(`/api/entries/${entryId}/facts`, { method: 'POST', body: JSON.stringify(data) }),
  updateFact: (id: string, data: unknown) =>
    fetchApi(`/api/facts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFact: (id: string) => fetchApi(`/api/facts/${id}`, { method: 'DELETE' }),

  importCv: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetch('/api/profile/import', {
      method: 'POST',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new ApiError(res.status, errorData.error || res.statusText || 'An error occurred')
      }
      return res.json()
    })
  },
}

export const preferencesApi = {
  getPreferences: () => fetchApi('/api/preferences'),
  updatePreferences: (data: unknown) =>
    fetchApi('/api/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
}

export const jdApi = {
  parseJd: (text: string) =>
    fetchApi('/api/jd/parse', { method: 'POST', body: JSON.stringify({ text }) }),
}

export const fitApi = {
  scoreFit: (jd: unknown) =>
    fetchApi('/api/fit/score', { method: 'POST', body: JSON.stringify({ jd }) }),
  recordDecision: (data: unknown) =>
    fetchApi('/api/fit/decision', { method: 'POST', body: JSON.stringify(data) }),
}
