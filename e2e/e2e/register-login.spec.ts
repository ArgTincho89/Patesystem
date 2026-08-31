import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test('E2E-S02: Registro + login', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(user);
    await loginPage.expectLoggedIn();
  } finally {
    await cleanupUiUser(api, user);
  }
});
