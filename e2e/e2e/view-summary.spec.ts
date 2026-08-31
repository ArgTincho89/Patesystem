import { test } from '@playwright/test';
import { SummaryPage } from '../pages/SummaryPage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';
import { authenticatePage } from '../fixtures/authHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test('E2E-S04: Ver resumen del mes', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    await authenticatePage(page, user, baseURL);
    await page.goto('/#/summary');
    await page.waitForSelector('#navbar', { state: 'visible' });

    const summaryPage = new SummaryPage(page);
    await summaryPage.expectSummaryLoaded();
  } finally {
    await cleanupUiUser(api, user);
  }
});
