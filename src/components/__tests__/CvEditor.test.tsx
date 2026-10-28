import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CvEditor } from '../CvEditor'
import { CvDraftOutput } from '@/lib/schemas/cvDraft'

const mockDraft: CvDraftOutput = {
  schemaVersion: 1,
  status: 'draft_ready',
  targetRole: 'Software Engineer',
  header: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
  },
  sections: [
    {
      sectionId: 'experience',
      heading: 'Experience',
      items: [
        {
          id: 'item-1',
          text: 'Developed cool features.',
          sourceEntryId: 'entry-1',
          sourceFactIds: ['fact-1'],
          verificationStatus: 'verified',
          matchedRequirementIds: [],
          warnings: [],
          title: 'Senior Dev',
          organization: 'Tech Co',
          dateString: '2020 - 2022'
        }
      ]
    }
  ],
  warnings: []
}

describe('CvEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    window.URL.createObjectURL = vi.fn()
    window.URL.revokeObjectURL = vi.fn()
  })

  it('renders the initial draft correctly', () => {
    render(<CvEditor initialDraft={mockDraft} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Experience')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Developed cool features.')[0]).toBeInTheDocument()
  })

  it('updates text and shows unverified badge', () => {
    render(<CvEditor initialDraft={mockDraft} />)
    const textarea = screen.getAllByDisplayValue('Developed cool features.')[0]
    fireEvent.change(textarea, { target: { value: 'Developed amazing features.' } })
    expect(screen.getAllByDisplayValue('Developed amazing features.')[0]).toBeInTheDocument()
    expect(screen.getByText('Unverified Edit')).toBeInTheDocument()
  })

  it('can hide and restore items', () => {
    render(<CvEditor initialDraft={mockDraft} />)
    const hideBtns = screen.getAllByRole('button', { name: 'Hide' }); const hideBtn = hideBtns[0]
    fireEvent.click(hideBtn)
    expect(screen.getAllByRole('button', { name: 'Restore' })[0]).toBeInTheDocument()
    const textarea = screen.getAllByDisplayValue('Developed cool features.')[0]
    expect(screen.getAllByDisplayValue('Developed cool features.')[0]).toBeInTheDocument()
  })

  it('handles undo and redo', () => {
    render(<CvEditor initialDraft={mockDraft} />)
    const textarea = screen.getAllByDisplayValue('Developed cool features.')[0]
    fireEvent.change(textarea, { target: { value: 'Developed amazing features.' } })

    const undoBtns = screen.getAllByRole('button', { name: 'Undo' }); const undoBtn = undoBtns[0]
    fireEvent.click(undoBtn)
    expect(screen.getAllByDisplayValue('Developed cool features.')[0]).toBeInTheDocument()

    const redoBtns = screen.getAllByRole('button', { name: 'Redo' }); const redoBtn = redoBtns[0]
    fireEvent.click(redoBtn)
    expect(screen.getAllByDisplayValue('Developed amazing features.')[0]).toBeInTheDocument()
  })

  it('runs fact check and enables export on success', async () => {
    render(<CvEditor initialDraft={mockDraft} />)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'passed',
        issues: []
      })
    } as any)

    const checkBtns = screen.getAllByRole('button', { name: 'Run Fact Check' }); const checkBtn = checkBtns[0]
    fireEvent.click(checkBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Status: PASSED')[0]).toBeInTheDocument()
    })
    expect(screen.getAllByText('Export Document')[0]).toBeInTheDocument()
  })

  it('runs fact check and blocks export on failure', async () => {
    render(<CvEditor initialDraft={mockDraft} />)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'blocked',
        issues: [{ id: '1', severity: 'blocking', explanation: 'Number changed' }]
      })
    } as any)

    const checkBtns = screen.getAllByRole('button', { name: 'Run Fact Check' }); const checkBtn = checkBtns[0]
    fireEvent.click(checkBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Status: BLOCKED')[0]).toBeInTheDocument()
    })
    expect(screen.queryByText('Export Document')).not.toBeInTheDocument()
  })
})
