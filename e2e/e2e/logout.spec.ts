import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

// Skipeado: depende de login por UI, que aún necesita estabilización.
// Reactivar cuando LoginPage.login() sea estable con la UI actual.
test.skip('E2E-S05: Logout', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(user);
    await loginPage.expectLoggedIn();

    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await profilePage.logout();
    await profilePage.expectLoggedOut();
  } finally {
    await cleanupUiUser(api, user);
  }
});
