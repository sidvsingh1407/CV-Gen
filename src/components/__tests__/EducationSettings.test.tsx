import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EducationSettings } from '../EducationSettings';
import { profileApi, ApiError } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  profileApi: {
    updateEducationSettings: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

describe('EducationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial value', () => {
    const { container } = render(<EducationSettings initialShowMarks={true} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('handles successful toggle', async () => {
    (profileApi.updateEducationSettings as unknown as import("vitest").Mock).mockResolvedValue({});
    const { container } = render(<EducationSettings initialShowMarks={false} />);

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(profileApi.updateEducationSettings).toHaveBeenCalledWith(true);
      expect(screen.getByText('Education settings saved successfully.')).toBeDefined();
    });
  });

  it('handles 401 unauthorized error', async () => {
    (profileApi.updateEducationSettings as unknown as import("vitest").Mock).mockRejectedValue(
      new ApiError(401, 'Unauthorized')
    );
    const { container } = render(<EducationSettings initialShowMarks={false} />);

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText(/Authentication is not implemented yet/i)).toBeDefined();
    });
  });
});
