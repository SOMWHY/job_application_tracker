import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useApplications } from '../lib/queries';
import { createTestQueryClient } from '../test/testUtils';

const { mockListApplications } = vi.hoisted(() => ({
  mockListApplications: vi.fn(),
}));

vi.mock('./api', () => ({
  api: {
    listApplications: (...args: unknown[]) => mockListApplications(...args),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateStatus: vi.fn(),
    deleteApplication: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getStats: vi.fn(),
  },
}));

const emptyResponse = {
  items: [],
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
};

function KeyProbe({ params }: { params: Parameters<typeof useApplications>[0] }) {
  useApplications(params);
  return null;
}

describe('useApplications 查询 key 依赖', () => {
  it('status/q 变化时按新参数重新请求', async () => {
    mockListApplications.mockResolvedValue(emptyResponse);
    const client = createTestQueryClient();

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <KeyProbe params={{ status: 'PENDING' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mockListApplications).toHaveBeenCalled());

    rerender(
      <QueryClientProvider client={client}>
        <KeyProbe params={{ status: 'INTERVIEW', q: '阿里' }} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockListApplications).toHaveBeenCalledWith({
        status: 'INTERVIEW',
        q: '阿里',
      });
    });
  });
});
