import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import FitReportPage from '../page'
import { fitApi, jdApi, ApiError } from '@/lib/api/client'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual('@/lib/api/client')
  return {
    ...actual,
    fitApi: {
      scoreFit: vi.fn(),
      recordDecision: vi.fn(),
    },
    jdApi: {
      parseJd: vi.fn(),
    },
  }
})

describe('Fit Report UI', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders initial empty state', () => {
    render(<FitReportPage />)
    expect(
      screen.getByRole('heading', { name: 'Fit Report & Decision Workflow' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate Fit Report' })).toBeDisabled()
  })

  it('handles successful scoring and displays report', async () => {
    const user = userEvent.setup()

    vi.mocked(jdApi.parseJd).mockResolvedValueOnce({} as any)
    vi.mocked(fitApi.scoreFit).mockResolvedValueOnce({
      status: 'scored',
      score: 85,
      threshold: 70,
      scoreBreakdown: {
        requiredSkills: { score: 25, weight: 30, coverage: 2 },
        requiredQualifications: { score: 20, weight: 20, coverage: 1 },
        experienceAndResponsibilities: { score: 20, weight: 25, coverage: 1 },
        preferredSkillsAndQuals: { score: 10, weight: 15, coverage: 1 },
        roleAlignment: { score: 10, weight: 10, coverage: 1 },
      },
      strengths: ['React'],
      gaps: ['Node.js'],
      uncertainties: [],
      requirements: [
        {
          id: '1',
          text: 'React',
          category: 'required_skill',
          isRequired: true,
          status: 'matched',
          explanation: 'Exact match',
          supportingEntryIds: ['a'],
          evidenceVerificationStatus: 'verified',
          dimensionContribution: 10,
        },
      ],
      excludedEvidenceCount: 0,
      dataLimitations: [],
    } as any)

    render(<FitReportPage />)
    const textarea = screen.getByPlaceholderText('Paste Job Description here...')
    await user.type(textarea, 'We need a React dev')

    const generateBtn = screen.getByRole('button', { name: 'Generate Fit Report' })
    await user.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText('Overall Assessment')).toBeInTheDocument()
    })

    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('Meets Threshold')).toBeInTheDocument()

    expect(screen.getByText('25.0 / 30')).toBeInTheDocument()
  })

  it('handles insufficient data state', async () => {
    const user = userEvent.setup()

    vi.mocked(jdApi.parseJd).mockResolvedValueOnce({} as any)
    vi.mocked(fitApi.scoreFit).mockResolvedValueOnce({
      status: 'insufficient_data',
      score: null,
      threshold: 70,
      scoreBreakdown: null,
      strengths: [],
      gaps: [],
      uncertainties: [],
      requirements: [],
      excludedEvidenceCount: 0,
      dataLimitations: ['Not enough data'],
    } as any)

    render(<FitReportPage />)
    const textarea = screen.getByPlaceholderText('Paste Job Description here...')
    await user.type(textarea, 'short jd')

    const generateBtn = screen.getByRole('button', { name: 'Generate Fit Report' })
    await user.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText('Insufficient Data to Score')).toBeInTheDocument()
      expect(screen.getByText('Not enough data')).toBeInTheDocument()
    })

    // Ensure no score is displayed
    expect(screen.queryByText('N/A /100')).toBeNull()
  })

  it('handles decision saving', async () => {
    const user = userEvent.setup()

    vi.mocked(jdApi.parseJd).mockResolvedValueOnce({} as any)
    vi.mocked(fitApi.scoreFit).mockResolvedValueOnce({
      status: 'scored',
      score: 50,
      threshold: 70,
      scoreBreakdown: {},
      strengths: [],
      gaps: [],
      uncertainties: [],
      requirements: [],
      excludedEvidenceCount: 0,
      dataLimitations: [],
    } as any)

    render(<FitReportPage />)
    const textarea = screen.getByPlaceholderText('Paste Job Description here...')
    await user.type(textarea, 'We need a Node dev')

    const generateBtn = screen.getByRole('button', { name: 'Generate Fit Report' })
    await user.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText('Overall Assessment')).toBeInTheDocument()
    })

    const proceedRadio = screen.getByLabelText('Proceed')
    await user.click(proceedRadio)

    const noteTextarea = screen.getByPlaceholderText('Record your thoughts...')
    await user.type(noteTextarea, 'Will apply anyway')

    vi.mocked(fitApi.recordDecision).mockResolvedValueOnce({} as any)

    const saveBtn = screen.getByRole('button', { name: 'Save Decision' })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Decision saved successfully!')).toBeInTheDocument()
    })

    expect(fitApi.recordDecision).toHaveBeenCalledWith({
      decision: 'proceed',
      note: 'Will apply anyway',
    })
  })
})
