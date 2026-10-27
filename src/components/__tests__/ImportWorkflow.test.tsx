import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportWorkflow } from '../ImportWorkflow'
import { profileApi, ApiError } from '@/lib/api/client'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api/client', () => ({
  profileApi: {
    importCv: vi.fn(),
    createEntry: vi.fn(),
    createFact: vi.fn(),
  },
  ApiError: class extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

describe('ImportWorkflow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders upload area initially', () => {
    render(<ImportWorkflow onImportComplete={() => {}} />)
    expect(screen.getByText('Import CV')).toBeInTheDocument()
    expect(screen.getByText('Upload & Parse')).toBeInTheDocument()
  })

  it('handles 401 error gracefully during upload', async () => {
    ;(profileApi.importCv as any).mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))

    render(<ImportWorkflow onImportComplete={() => {}} />)

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-upload') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    const uploadBtn = screen.getByText('Upload & Parse')
    if (uploadBtn.hasAttribute('disabled')) {
      uploadBtn.removeAttribute('disabled')
    }
    fireEvent.click(uploadBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Authentication is not implemented yet. Import is unavailable.'),
      ).toBeInTheDocument()
    })
  })

  it('displays draft review and allows saving entries', async () => {
    const mockDraft = {
      header: { fullName: 'John Doe' },
      entries: [{ type: 'experience', title: 'Developer', facts: [{ text: 'Did things' }] }],
    }
    ;(profileApi.importCv as any).mockResolvedValue({ draftProfile: mockDraft })
    ;(profileApi.createEntry as any).mockResolvedValue({ id: '123' })
    ;(profileApi.createFact as any).mockResolvedValue({})

    const onCompleteMock = vi.fn()
    render(<ImportWorkflow onImportComplete={onCompleteMock} />)

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-upload') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    const uploadBtn = screen.getByText('Upload & Parse')
    if (uploadBtn.hasAttribute('disabled')) {
      uploadBtn.removeAttribute('disabled')
    }
    fireEvent.click(uploadBtn)

    await waitFor(() => {
      expect(profileApi.importCv).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('Review Draft Profile')).toBeInTheDocument()
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    const saveBtn = screen.getByText(/Import 1 Entries/)
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(profileApi.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Developer' }),
      )
      expect(profileApi.createFact).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({ text: 'Did things' }),
      )
      expect(onCompleteMock).toHaveBeenCalled()
    })
  })
})
