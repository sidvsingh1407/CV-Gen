'use client'

import { useState } from 'react'
import { jdApi, ApiError } from '@/lib/api/client'
import type { JdParsedResult } from '@/lib/schemas/jdParser'

export default function JdParserPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<JdParsedResult | null>(null)

  const MAX_LENGTH = 30000

  const handleParse = async () => {
    setError(null)
    setResult(null)

    const trimmed = text.trim()
    if (!trimmed) {
      setError('Job description cannot be empty.')
      return
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`Job description exceeds maximum length of ${MAX_LENGTH} characters.`)
      return
    }

    setLoading(true)
    try {
      const data = await jdApi.parseJd(trimmed)
      setResult(data)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('JD parsing is unavailable until authentication is implemented.')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Job Description Parser</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <label htmlFor="jd-text" className="block text-sm font-medium text-gray-700 mb-2">
          Paste Job Description
        </label>
        <textarea
          id="jd-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          placeholder="Paste the job description text here..."
        />
        <div className="flex justify-between items-center mt-2">
          <span
            className={`text-sm ${text.length > MAX_LENGTH ? 'text-red-600 font-medium' : 'text-gray-500'}`}
          >
            {text.length} / {MAX_LENGTH} characters
          </span>
          <button
            onClick={handleParse}
            disabled={loading || text.trim().length === 0 || text.length > MAX_LENGTH}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Parsing...' : 'Parse JD'}
          </button>
        </div>
        {error && <p className="mt-4 text-red-600 text-sm font-medium">{error}</p>}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
          <h2 className="text-xl font-semibold border-b pb-2">Parsed Results</h2>

          {result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h3>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Job Details</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="inline font-medium">Title: </dt>
                  <dd className="inline">{result.jobTitle || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Company: </dt>
                  <dd className="inline">{result.companyName || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Location: </dt>
                  <dd className="inline">{result.location || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Work Arrangement: </dt>
                  <dd className="inline capitalize">{result.workArrangement}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Employment Type: </dt>
                  <dd className="inline capitalize">{result.employmentType.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Seniority: </dt>
                  <dd className="inline capitalize">{result.seniority}</dd>
                </div>
                {result.salaryRange && (
                  <div>
                    <dt className="inline font-medium">Salary: </dt>
                    <dd className="inline">
                      {result.salaryRange.currency === 'USD' ? '$' : ''}
                      {result.salaryRange.min} - {result.salaryRange.currency === 'USD' ? '$' : ''}
                      {result.salaryRange.max}
                      {result.salaryRange.payPeriod ? ` / ${result.salaryRange.payPeriod}` : ''}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Requirements</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="inline font-medium">Experience: </dt>
                  <dd className="inline">{result.experienceRequirement || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Education: </dt>
                  <dd className="inline">{result.educationRequirement || 'Not specified'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-6">
            {result.requiredSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Required Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.requiredSkills.map((s, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.preferredSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Preferred Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.preferredSkills.map((s, i) => (
                    <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.responsibilities.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Responsibilities
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.requiredQualifications.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Required Qualifications
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.requiredQualifications.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.preferredQualifications.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                  Preferred Qualifications
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.preferredQualifications.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.benefits.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Benefits</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.benefits.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.unparsedSections.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-4 border-t pt-4">
                Unparsed Sections
              </h3>
              <div className="space-y-4">
                {result.unparsedSections.map((sec, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded border">
                    {sec.heading && <h4 className="font-medium text-sm mb-2">{sec.heading}</h4>}
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-600">
                      {sec.text}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
