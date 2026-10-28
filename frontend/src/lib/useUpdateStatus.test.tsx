import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useApplications, useUpdateStatus, applicationKeys } from '../lib/queries';
import type { Application, ApplicationListResponse } from '../types';
import { createTestQueryClient } from '../test/testUtils';

const { mockListApplications, mockUpdateStatus } = vi.hoisted(() => ({
  mockListApplications: vi.fn(),
  mockUpdateStatus: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    listApplications: (...args: unknown[]) => mockListApplications(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getStats: vi.fn(),
  },
}));

function makeApp(id: string, status: Application['status']): Application {
  return {
    id,
    userId: 'u1',
    company: `公司${id}`,
    position: '前端',
    appliedDate: '2025-01-01',
    status,
    source: null,
    link: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

function seedList(
  client: ReturnType<typeof createTestQueryClient>,
  items: Application[],
) {
  client.setQueryData<ApplicationListResponse>(applicationKeys.list({}), {
    items,
    pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
  });
}

function Harness({ id, nextStatus }: { id: string; nextStatus: Application['status'] }) {
  const { data } = useApplications({});
  const mutation = useUpdateStatus();
  return (
    <div>
      <ul>
        {(data?.items ?? []).map((a) => (
          <li key={a.id} data-testid={`row-${a.id}`}>
            {a.status}
          </li>
        ))}
      </ul>
      <button onClick={() => mutation.mutate({ id, status: nextStatus })}>update</button>
    </div>
  );
}

describe('useUpdateStatus 乐观更新', () => {
  it('列表缓存立即变为新状态，并在 onSettled 后失效重取', async () => {
    const client = createTestQueryClient();
    seedList(client, [makeApp('a1', 'PENDING')]);
    mockUpdateStatus.mockResolvedValue(makeApp('a1', 'INTERVIEW'));
    mockListApplications.mockResolvedValue({
      items: [makeApp('a1', 'INTERVIEW')],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={client}>
        <Harness id="a1" nextStatus="INTERVIEW" />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('row-a1')).toHaveTextContent('PENDING');

    fireEvent.click(screen.getByText('update'));

    // 乐观更新：无需等网络请求完成，UI 立即呈现新状态
    await waitFor(() => {
      expect(screen.getByTestId('row-a1')).toHaveTextContent('INTERVIEW');
    });
    expect(mockUpdateStatus).toHaveBeenCalledWith('a1', 'INTERVIEW');
  });

  it('失败时回滚到快照旧状态', async () => {
    const client = createTestQueryClient();
    seedList(client, [makeApp('a1', 'PENDING')]);
    mockUpdateStatus.mockRejectedValue(new Error('更新失败'));

    render(
      <QueryClientProvider client={client}>
        <Harness id="a1" nextStatus="OFFER" />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(screen.getByTestId('row-a1')).toHaveTextContent('PENDING');
    });
  });
});
