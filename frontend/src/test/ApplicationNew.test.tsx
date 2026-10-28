import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ApplicationNew from '../pages/ApplicationNew';
import { createTestQueryClient } from './testUtils';

const { mockCreateApplication } = vi.hoisted(() => ({
  mockCreateApplication: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    createApplication: (...args: unknown[]) => mockCreateApplication(...args),
    listApplications: vi.fn(),
    getApplication: vi.fn(),
    updateApplication: vi.fn(),
    updateStatus: vi.fn(),
    deleteApplication: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    getStats: vi.fn(),
  },
}));

describe('ApplicationNew 表单校验', () => {
  it('company 为空显示字段错误且不提交', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <ApplicationNew />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // 触发表单校验（company 为空、position 为空）
    await user.click(screen.getByTestId('app-save'));

    expect(await screen.findByText('请填写公司名称')).toBeInTheDocument();
    expect(screen.getByText('请填写职位')).toBeInTheDocument();
    expect(mockCreateApplication).not.toHaveBeenCalled();
  });

  it('link 非法 URL 显示字段错误且不提交', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <ApplicationNew />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByTestId('app-company'), 'Acme');
    await user.type(screen.getByTestId('app-position'), 'Engineer');
    await user.type(screen.getByTestId('app-link'), 'not-a-url');
    await user.click(screen.getByTestId('app-save'));

    expect(await screen.findByText('请输入合法的 URL')).toBeInTheDocument();
    expect(mockCreateApplication).not.toHaveBeenCalled();
  });
});
