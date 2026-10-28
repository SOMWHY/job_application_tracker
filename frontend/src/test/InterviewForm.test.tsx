import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplicationDetail from '../pages/ApplicationDetail';
import type { Application } from '../types';
import { interviewRoundSchema } from '../lib/validation';
import { createTestQueryClient } from './testUtils';

const {
  mockGetApplication,
  mockListInterviews,
  mockListNotes,
  mockCreateInterview,
} = vi.hoisted(() => ({
  mockGetApplication: vi.fn(),
  mockListInterviews: vi.fn(),
  mockListNotes: vi.fn(),
  mockCreateInterview: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    listApplications: vi.fn(),
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateStatus: vi.fn(),
    deleteApplication: vi.fn(),
    listNotes: (...args: unknown[]) => mockListNotes(...args),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getStats: vi.fn(),
    listInterviews: (...args: unknown[]) => mockListInterviews(...args),
    createInterview: (...args: unknown[]) => mockCreateInterview(...args),
    deleteInterview: vi.fn(),
  },
}));

function makeApp(): Application {
  return {
    id: 'app1',
    userId: 'u1',
    company: 'Acme',
    position: '前端工程师',
    appliedDate: '2025-01-01',
    status: 'PENDING',
    source: null,
    link: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    statusHistory: [],
    notes: [],
    interviewRounds: [],
    _count: { notes: 0 },
  };
}

function renderDetail() {
  const client = createTestQueryClient();
  mockGetApplication.mockResolvedValue(makeApp());
  mockListInterviews.mockResolvedValue([]);
  mockListNotes.mockResolvedValue([]);

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/applications/app1']}>
        <Routes>
          <Route path="/applications/:id" element={<ApplicationDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe('面试轮次表单校验', () => {
  it('scheduledAt 为空显示字段错误且不提交', async () => {
    const user = userEvent.setup();
    renderDetail();

    // 等待详情页加载完成（面试轮次表单可用）
    expect(await screen.findByText('面试轮次')).toBeInTheDocument();

    await user.click(screen.getByTestId('interview-add'));

    expect(await screen.findByText('请选择面试时间')).toBeInTheDocument();
    expect(mockCreateInterview).not.toHaveBeenCalled();
  });

  it('scheduledAt 无效时校验返回格式错误', async () => {
    const parsed = interviewRoundSchema.safeParse({
      type: 'HR',
      scheduledAt: 'not-a-date',
      result: 'PENDING',
      feedback: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('面试时间格式无效');
    }
  });
});
