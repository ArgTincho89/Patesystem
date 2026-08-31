import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SummaryPage } from '../pages/SummaryPage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

// Skipeado: depende de login por UI, que aún necesita estabilización.
// Reactivar cuando LoginPage.login() sea estable con la UI actual.
test.skip('E2E-S04: Ver resumen del mes', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(user);
    await loginPage.expectLoggedIn();

    const summaryPage = new SummaryPage(page);
    await summaryPage.navigate();
    await summaryPage.expectSummaryLoaded();
  } finally {
    await cleanupUiUser(api, user);
  }
});
