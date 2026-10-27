import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import JdParserPage from '../page'
import { jdApi, ApiError } from '@/lib/api/client'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual('@/lib/api/client')
  return {
    ...actual,
    jdApi: {
      parseJd: vi.fn(),
    },
  }
})

describe('JD Parser UI', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders initial empty state correctly', () => {
    render(<JdParserPage />)
    expect(screen.getByRole('heading', { name: 'Job Description Parser' })).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Paste the job description text here...'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Parse JD' })).toBeDisabled() // disabled when empty
  })

  it('handles input and character limit', async () => {
    const user = userEvent.setup()
    render(<JdParserPage />)

    const textarea = screen.getByPlaceholderText('Paste the job description text here...')
    await user.type(textarea, 'Some JD text')

    expect(textarea).toHaveValue('Some JD text')
    expect(screen.getByText(/12 \/ 30000 characters/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Parse JD' })).toBeEnabled()
  })

  it('displays validation error if input exceeds max length', async () => {
    // Too slow to type 30k chars, just set value
    render(<JdParserPage />)
    const textarea = screen.getByPlaceholderText('Paste the job description text here...')
    fireEvent.change(textarea, { target: { value: 'a'.repeat(30001) } })

    const parseBtn = screen.getByRole('button', { name: 'Parse JD' })
    expect(parseBtn).toBeDisabled()
    expect(screen.getByText(/30001 \/ 30000 characters/)).toHaveClass('text-red-600')
  })

  it('handles successful parsing', async () => {
    const user = userEvent.setup()
    const mockResult = {
      schemaVersion: 1,
      jobTitle: 'Software Engineer',
      companyName: null,
      location: null,
      workArrangement: 'remote',
      employmentType: 'full_time',
      seniority: 'senior',
      requiredSkills: ['React'],
      preferredSkills: [],
      responsibilities: ['Write code'],
      requiredQualifications: [],
      preferredQualifications: [],
      experienceRequirement: null,
      educationRequirement: null,
      salaryRange: null,
      benefits: [],
      keywords: [],
      unparsedSections: [],
      warnings: [],
    }

    vi.mocked(jdApi.parseJd).mockResolvedValueOnce(mockResult as any)

    render(<JdParserPage />)
    const textarea = screen.getByPlaceholderText('Paste the job description text here...')
    await user.type(textarea, 'Some JD text')

    const parseBtn = screen.getByRole('button', { name: 'Parse JD' })
    await user.click(parseBtn)

    await waitFor(() => {
      expect(screen.getByText('Parsed Results')).toBeInTheDocument()
    })

    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Write code')).toBeInTheDocument()
  })

  it('handles 401 API error', async () => {
    const user = userEvent.setup()
    vi.mocked(jdApi.parseJd).mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))

    render(<JdParserPage />)
    const textarea = screen.getByPlaceholderText('Paste the job description text here...')
    await user.type(textarea, 'Some JD text')

    const parseBtn = screen.getByRole('button', { name: 'Parse JD' })
    await user.click(parseBtn)

    await waitFor(() => {
      expect(
        screen.getByText('JD parsing is unavailable until authentication is implemented.'),
      ).toBeInTheDocument()
    })
  })
})
