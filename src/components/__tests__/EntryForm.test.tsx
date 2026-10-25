import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntryForm } from '../EntryForm';
import { EntryType } from '@prisma/client';

describe('EntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(
      <EntryForm type={EntryType.experience} onCancel={vi.fn()} onSave={vi.fn()} />
    );
    expect(container.querySelector('input[name="title"]')).toBeDefined();
    expect(container.querySelector('select[name="visibility"]')).toBeDefined();
  });
});
