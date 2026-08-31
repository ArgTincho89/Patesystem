import { test } from '@playwright/test';
import { ProfilePage } from '../pages/ProfilePage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';
import { authenticatePage } from '../fixtures/authHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test('E2E-S05: Logout', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    await authenticatePage(page, user, baseURL);
    await page.goto('/#/profile');
    await page.waitForSelector('#navbar', { state: 'visible' });

    const profilePage = new ProfilePage(page);
    await profilePage.logout();
    await profilePage.expectLoggedOut();
  } finally {
    await cleanupUiUser(api, user);
  }
});
