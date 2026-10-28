import { test, expect, Page } from '@playwright/test';

// Self-contained E2E: registers a fresh user each run (unique email via timestamp),
// then exercises the full happy path through the UI.

const password = 'e2e-password-123';
const name = 'E2E Tester';

async function register(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/register');
  await page.getByTestId('register-name').fill(name);
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

test.describe('Job Application Tracker E2E', () => {
  test('register → create application → add note → change status → kanban → logout', async ({
    page,
  }) => {
    // 1. Register lands on dashboard
    await register(page);
    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible();
    await expect(page.getByTestId('stat-total')).toHaveText('0');

    // 2. Create an application
    await page.goto('/applications/new');
    await page.getByTestId('app-company').fill('Acme E2E');
    await page.getByTestId('app-position').fill('Frontend Engineer');
    await page.getByTestId('app-save').click();

    // 3. Detail page shows company + position
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);
    await expect(page.getByRole('heading', { name: 'Acme E2E' })).toBeVisible();
    await expect(page.getByText('Frontend Engineer')).toBeVisible();

    // 4. Add a note
    await page.getByTestId('note-input').fill('HR 电话初筛通过');
    await page.getByTestId('note-add').click();
    await expect(page.getByText('HR 电话初筛通过')).toBeVisible();

    // 5. Change status to INTERVIEW
    await page.getByTestId('status-INTERVIEW').click();
    await expect(page.getByTestId('status-INTERVIEW')).toBeDisabled();

    // 6. Applications list shows the item; switch to kanban
    await page.goto('/applications');
    await expect(page.getByText('Acme E2E')).toBeVisible();
    await page.getByTestId('view-kanban').click();
    await expect(page.getByText('Acme E2E')).toBeVisible();

    // 7. Dashboard stat reflects 1 total
    await page.goto('/dashboard');
    await expect(page.getByTestId('stat-total')).toHaveText('1');

    // 8. Logout returns to login
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    const email = await register(page);
    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill('wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText(/登录失败|Invalid/i)).toBeVisible();
  });

  test('protected route redirects anonymous user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('search input debounces and filters the list', async ({ page }) => {
    await register(page);

    await page.goto('/applications/new');
    await page.getByTestId('app-company').fill('Alpha Debounce Co');
    await page.getByTestId('app-position').fill('Engineer');
    await page.getByTestId('app-save').click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);

    await page.goto('/applications/new');
    await page.getByTestId('app-company').fill('Beta Debounce Co');
    await page.getByTestId('app-position').fill('Engineer');
    await page.getByTestId('app-save').click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);

    await page.goto('/applications');
    await expect(page.getByText('Alpha Debounce Co')).toBeVisible();
    await expect(page.getByText('Beta Debounce Co')).toBeVisible();

    await page.getByTestId('search-input').fill('Beta');
    // 300ms 防抖后自动过滤
    await expect(page.getByText('Beta Debounce Co')).toBeVisible();
    await expect(page.getByText('Alpha Debounce Co')).toHaveCount(0);
  });

  test('kanban drag updates status optimistically and persists after reload', async ({
    page,
  }) => {
    await register(page);

    await page.goto('/applications/new');
    await page.getByTestId('app-company').fill('Optimistic Drag Co');
    await page.getByTestId('app-position').fill('Engineer');
    await page.getByTestId('app-save').click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);

    await page.goto('/applications');
    await page.getByTestId('view-kanban').click();

    // 新建的申请初始在「已投递」列
    await expect(
      page.getByTestId('kanban-drop-PENDING').getByText('Optimistic Drag Co'),
    ).toBeVisible();

    const source = page.getByText('Optimistic Drag Co');
    const target = page.getByTestId('kanban-drop-INTERVIEW');
    const targetBox = await target.boundingBox();
    const sourceBox = await source.boundingBox();
    if (!targetBox || !sourceBox) throw new Error('无法获取拖拽目标/源元素坐标');

    // 用鼠标事件模拟 @hello-pangea/dnd 的拖拽（鼠标传感器）
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    // 乐观更新：卡片立即出现在目标列
    await expect(
      page.getByTestId('kanban-drop-INTERVIEW').getByText('Optimistic Drag Co'),
    ).toBeVisible();

    // 刷新后状态持久
    await page.reload();
    await page.getByTestId('view-kanban').click();
    await expect(
      page.getByTestId('kanban-drop-INTERVIEW').getByText('Optimistic Drag Co'),
    ).toBeVisible();
  });

  test('add HR interview round with PASS auto-changes status to OFFER and persists', async ({
    page,
  }) => {
    await register(page);

    await page.goto('/applications/new');
    await page.getByTestId('app-company').fill('Interview Round Co');
    await page.getByTestId('app-position').fill('Engineer');
    await page.getByTestId('app-save').click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);

    // 添加 HR 面试轮次并标记通过
    await page.getByTestId('interview-type').selectOption('HR');
    await page.getByTestId('interview-time').fill('2025-10-01T10:00');
    await page.getByTestId('interview-result').selectOption('PASS');
    await page.getByTestId('interview-feedback').fill('HR 面通过，薪资谈妥');
    await page.getByTestId('interview-add').click();

    // 轮次与状态自动联动：OFFER 状态按钮禁用，时间线出现轮次与状态变更记录
    await expect(page.getByTestId('status-OFFER')).toBeDisabled();
    await expect(page.getByText('面试 · HR')).toBeVisible();
    await expect(page.getByText('状态变更')).toBeVisible();
    await expect(page.getByText('待处理 → 已 Offer')).toBeVisible();
    await expect(page.getByText('HR 面通过，薪资谈妥').first()).toBeVisible();

    // 刷新后持久化
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Interview Round Co' })).toBeVisible();
    await expect(page.getByTestId('status-OFFER')).toBeDisabled();
    await expect(page.getByText('面试 · HR')).toBeVisible();
    await expect(page.getByText('待处理 → 已 Offer')).toBeVisible();
  });
});
