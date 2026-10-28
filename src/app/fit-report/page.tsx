'use client'

import { useState } from 'react'
import { fitApi, ApiError, jdApi } from '@/lib/api/client'
import type { FitScoreResult } from '@/lib/schemas/fitScore'
import type { FitDecision } from '@/lib/schemas/fitDecision'

export default function FitReportPage() {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FitScoreResult | null>(null)
  const [decision, setDecision] = useState<FitDecision>('undecided')
  const [decisionNote, setDecisionNote] = useState('')
  const [savingDecision, setSavingDecision] = useState(false)
  const [decisionSaved, setDecisionSaved] = useState(false)

  const handleScore = async () => {
    setError(null)
    setResult(null)
    setDecision('undecided')
    setDecisionNote('')
    setDecisionSaved(false)

    if (!jdText.trim()) {
      setError('Job description cannot be empty.')
      return
    }

    setLoading(true)
    try {
      // For this workflow, first parse the JD
      const jdParsed = await jdApi.parseJd(jdText)
      // Then score it
      const data = await fitApi.scoreFit(jdParsed)
      setResult(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDecision = async () => {
    setError(null)
    setSavingDecision(true)
    setDecisionSaved(false)
    try {
      await fitApi.recordDecision({ decision, note: decisionNote })
      setDecisionSaved(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setSavingDecision(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold">Fit Report & Decision Workflow</h1>

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label htmlFor="jd-text" className="block text-sm font-medium text-gray-700 mb-2">
          Job Description
        </label>
        <textarea
          id="jd-text"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm mb-4"
          placeholder="Paste Job Description here..."
        />
        <button
          onClick={handleScore}
          disabled={loading || jdText.trim().length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Generate Fit Report'}
        </button>
        {error && <p className="mt-4 text-red-600 text-sm font-medium">{error}</p>}
      </div>

      {/* Report Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">
          {/* Overall Assessment */}
          <section>
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Overall Assessment</h2>
            {result.status === 'insufficient_data' ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <p className="text-yellow-800 font-medium">Insufficient Data to Score</p>
                <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                  {result.dataLimitations.map((limit, idx) => (
                    <li key={idx}>{limit}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 p-6 rounded-lg border">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">
                    Fit Score
                  </p>
                  <div className="text-5xl font-bold mt-1 text-gray-900">
                    {result.score !== null ? result.score : 'N/A'}
                    <span className="text-2xl text-gray-400">/100</span>
                  </div>
                </div>
                <div className="text-center md:text-right space-y-1">
                  <p className="text-sm text-gray-600">
                    Configured Threshold: <span className="font-semibold">{result.threshold}</span>
                  </p>
                  <p className="text-sm">
                    {result.score !== null && result.score >= result.threshold ? (
                      <span className="text-green-600 font-semibold bg-green-100 px-2 py-1 rounded">
                        Meets Threshold
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold bg-red-100 px-2 py-1 rounded">
                        Below Threshold
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4 italic">
              Note: This score is a deterministic heuristic estimate of profile/JD alignment, not a
              hiring probability or guarantee.
            </p>
          </section>

          {/* Score Breakdown */}
          {result.status === 'scored' && result.scoreBreakdown && (
            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.scoreBreakdown).map(([key, breakdown]) => (
                  <div key={key} className="bg-gray-50 p-4 rounded border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium capitalize text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {breakdown.score.toFixed(1)} / {breakdown.weight}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(breakdown.score / breakdown.weight) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right">
                      Evaluated Coverage: {breakdown.coverage} requirements
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Strengths, Gaps, Uncertainties */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-md font-semibold text-green-700 mb-2 border-b pb-1">Strengths</h3>
              {result.strengths.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No explicit strengths identified.</p>
              )}
            </div>
            <div>
              <h3 className="text-md font-semibold text-red-700 mb-2 border-b pb-1">Gaps</h3>
              {result.gaps.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No explicit gaps identified.</p>
              )}
            </div>
            <div>
              <h3 className="text-md font-semibold text-yellow-700 mb-2 border-b pb-1">
                Uncertainties
              </h3>
              {result.uncertainties.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No uncertainties identified.</p>
              )}
            </div>
          </section>

          {/* Requirement Analysis */}
          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Requirement Analysis</h3>
            <div className="space-y-4">
              {['matched', 'partially_matched', 'uncertain', 'not_found', 'not_evaluated'].map(
                (status) => {
                  const reqs = result.requirements.filter((r) => r.status === status)
                  if (reqs.length === 0) return null

                  const statusColors: Record<string, string> = {
                    matched: 'bg-green-50 border-green-200 text-green-800',
                    partially_matched: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                    uncertain: 'bg-orange-50 border-orange-200 text-orange-800',
                    not_found: 'bg-red-50 border-red-200 text-red-800',
                    not_evaluated: 'bg-gray-50 border-gray-200 text-gray-800',
                  }

                  const statusLabels: Record<string, string> = {
                    matched: 'Matched',
                    partially_matched: 'Partially Matched',
                    uncertain: 'Uncertain',
                    not_found: 'Not Found / Gap',
                    not_evaluated: 'Not Evaluated',
                  }

                  return (
                    <div key={status} className={`p-4 rounded-lg border ${statusColors[status]}`}>
                      <h4 className="font-semibold mb-3">{statusLabels[status]}</h4>
                      <div className="space-y-3">
                        {reqs.map((req) => (
                          <div
                            key={req.id}
                            className="bg-white p-3 rounded border shadow-sm text-sm text-gray-800"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium pr-4">{req.text}</span>
                              <span className="text-xs uppercase tracking-wider text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                                {req.category.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs mb-2">{req.explanation}</p>
                            <div className="flex gap-2 flex-wrap">
                              <span
                                className={`text-xs px-2 py-1 rounded ${req.isRequired ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}
                              >
                                {req.isRequired ? 'Required' : 'Preferred'}
                              </span>
                              {req.evidenceVerificationStatus === 'unknown' && (
                                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                                  Unverified Evidence
                                </span>
                              )}
                              {req.supportingEntryIds.length > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                                  {req.supportingEntryIds.length} Profile Entry(ies) Match
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </section>

          {/* User Decision */}
          <section className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Your Decision</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Will you proceed with this opportunity?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="decision"
                      value="undecided"
                      checked={decision === 'undecided'}
                      onChange={(e) => setDecision(e.target.value as FitDecision)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Undecided</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="decision"
                      value="proceed"
                      checked={decision === 'proceed'}
                      onChange={(e) => setDecision(e.target.value as FitDecision)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Proceed</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="decision"
                      value="do_not_proceed"
                      checked={decision === 'do_not_proceed'}
                      onChange={(e) => setDecision(e.target.value as FitDecision)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Do Not Proceed</span>
                  </label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="decision-note"
                  className="block text-sm font-medium text-blue-800 mb-2"
                >
                  Decision Note (Optional)
                </label>
                <textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  maxLength={2000}
                  className="w-full h-24 p-3 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Record your thoughts..."
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveDecision}
                  disabled={savingDecision}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                >
                  {savingDecision ? 'Saving...' : 'Save Decision'}
                </button>
                {decisionSaved && (
                  <span className="text-green-700 text-sm font-medium bg-green-50 px-3 py-1 rounded border border-green-200">
                    Decision saved successfully!
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
