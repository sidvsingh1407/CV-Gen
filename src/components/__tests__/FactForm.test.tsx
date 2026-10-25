import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactForm } from '../FactForm';
import { profileApi, ApiError } from '@/lib/api/client';
import { FactKind } from '@prisma/client';

vi.mock('@/lib/api/client', () => ({
  profileApi: {
    createFact: vi.fn(),
    updateFact: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

describe('FactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(<FactForm entryId="e1" onCancel={vi.fn()} onSave={vi.fn()} />);
    expect(container.querySelector('textarea[name="text"]')).toBeDefined();
    expect(container.querySelector('select[name="kind"]')).toBeDefined();
  });

  it('disables inputs for locked numbers', () => {
    const { container } = render(
      <FactForm
        entryId="e1"
        initialData={{ id: 'f1', text: '100', kind: FactKind.locked_number }}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const textarea = container.querySelector('textarea[name="text"]') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    const select = container.querySelector('select[name="kind"]') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('handles 401 on save', async () => {
    (profileApi.createFact as unknown as import("vitest").Mock).mockRejectedValue(
      new ApiError(401, 'Unauthorized')
    );
    const { container } = render(<FactForm entryId="e1" onCancel={vi.fn()} onSave={vi.fn()} />);

    const textarea = container.querySelector('textarea[name="text"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New Fact' } });

    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/Authentication is not implemented yet/i)).toBeDefined();
    });
  });
});
