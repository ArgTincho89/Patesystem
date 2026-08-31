import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';
import { authenticatePage } from '../fixtures/authHelpers';
import { today } from '../fixtures/test-data';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test('E2E-S03: Crear una transacción de gasto', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    // Pre-condición: categoría creada por API.
    const category = await (await api.post('/api/categories', {
      data: { nombre: 'Supermercado UI', color: '#FF6B6B' },
    })).json();

    await authenticatePage(page, user, baseURL);
    await page.goto('/#/home');
    await page.waitForSelector('#navbar', { state: 'visible' });

    const homePage = new HomePage(page);
    await homePage.createExpense('Supermercado UI', 'Compra semanal', 75.5, today());
    await homePage.expectTransactionVisible('Compra semanal');
  } finally {
    await cleanupUiUser(api, user);
  }
});
