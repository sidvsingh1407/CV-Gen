import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileHeaderForm } from '../ProfileHeaderForm';
import { profileApi, ApiError } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  profileApi: {
    updateProfileHeader: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

describe('ProfileHeaderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial data', () => {
    const initialData = {
      fullName: 'John Doe',
      email: 'john@example.com',
    };
    const { container } = render(<ProfileHeaderForm initialData={initialData} />);
    const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
    expect(nameInput.value).toBe('John Doe');
  });

  it('handles 401 on save', async () => {
    (profileApi.updateProfileHeader as unknown as import("vitest").Mock).mockRejectedValue(
      new ApiError(401, 'Unauthorized')
    );
    const { container } = render(<ProfileHeaderForm />);

    const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/Authentication is not implemented yet/i)).toBeDefined();
    });
  });
});
