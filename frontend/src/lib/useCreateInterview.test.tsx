import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useInterviews, useCreateInterview, applicationKeys } from '../lib/queries';
import type { InterviewRound, InterviewRoundType, InterviewRoundResult } from '../types';
import { createTestQueryClient } from '../test/testUtils';

const { mockListInterviews, mockCreateInterview } = vi.hoisted(() => ({
  mockListInterviews: vi.fn(),
  mockCreateInterview: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    listApplications: vi.fn(),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateStatus: vi.fn(),
    deleteApplication: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getStats: vi.fn(),
    listInterviews: (...args: unknown[]) => mockListInterviews(...args),
    createInterview: (...args: unknown[]) => mockCreateInterview(...args),
    deleteInterview: vi.fn(),
  },
}));

function makeRound(
  id: string,
  overrides: Partial<InterviewRound> = {},
): InterviewRound {
  return {
    id,
    applicationId: 'app1',
    type: 'HR' as InterviewRoundType,
    scheduledAt: '2025-06-01T10:00:00.000Z',
    result: 'PENDING' as InterviewRoundResult,
    feedback: null,
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function Harness({ id }: { id: string }) {
  const { data } = useInterviews(id);
  const mutation = useCreateInterview(id);
  return (
    <div>
      <ul>
        {(data ?? []).map((r) => (
          <li key={r.id} data-testid={r.id}>
            {r.id}:{r.type}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          mutation.mutate({
            type: 'TECH',
            scheduledAt: '2025-07-01T10:00:00.000Z',
            result: 'PASS',
            feedback: '',
          })
        }
      >
        add
      </button>
    </div>
  );
}

describe('useCreateInterview 乐观更新', () => {
  const tempMatcher = (content: string) => content.startsWith('temp-');

  it('列表缓存立即出现临时轮次，成功后替换为真实轮次', async () => {
    const client = createTestQueryClient();
    const existing = makeRound('r1');
    client.setQueryData<InterviewRound[]>(applicationKeys.interviews('app1'), [existing]);

    let resolveCreate!: (value: InterviewRound) => void;
    mockCreateInterview.mockReturnValue(
      new Promise<InterviewRound>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    mockListInterviews.mockResolvedValue([existing]);

    render(
      <QueryClientProvider client={client}>
        <Harness id="app1" />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('r1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('add'));

    // 乐观更新：立即出现 temp- 前缀的临时轮次（类型 TECH）
    const tempRow = await screen.findByText(tempMatcher);
    expect(tempRow).toHaveTextContent(':TECH');
    expect(mockCreateInterview).toHaveBeenCalledWith('app1', {
      type: 'TECH',
      scheduledAt: '2025-07-01T10:00:00.000Z',
      result: 'PASS',
      feedback: '',
    });

    // 成功：替换为真实轮次，temp- 消失
    const created = makeRound('r2', {
      type: 'TECH',
      scheduledAt: '2025-07-01T10:00:00.000Z',
      result: 'PASS',
    });
    mockListInterviews.mockResolvedValue([existing, created]);
    resolveCreate(created);

    await waitFor(() => {
      expect(screen.queryByText(tempMatcher)).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('r2')).toHaveTextContent('r2:TECH');
  });

  it('失败时回滚到快照旧列表', async () => {
    const client = createTestQueryClient();
    const existing = makeRound('r1');
    client.setQueryData<InterviewRound[]>(applicationKeys.interviews('app1'), [existing]);
    let rejectCreate!: (err: unknown) => void;
    mockCreateInterview.mockReturnValue(
      new Promise<InterviewRound>((_resolve, reject) => {
        rejectCreate = reject;
      }),
    );
    mockListInterviews.mockResolvedValue([existing]);

    render(
      <QueryClientProvider client={client}>
        <Harness id="app1" />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText('add'));

    // 临时轮次出现，随后失败回滚
    await screen.findByText(tempMatcher);
    rejectCreate(new Error('创建失败'));
    await waitFor(() => {
      expect(screen.queryByText(tempMatcher)).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('r1')).toBeInTheDocument();
  });
});
