import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { createUiUser, cleanupUiUser } from '../fixtures/uiHelpers';
import { today } from '../fixtures/test-data';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

// Skipeado: el Page Object del modal de transacción necesita ajustes al DOM real.
// Reactivar cuando HomePage.createExpense() sea estable con TransactionForm.
test.skip('E2E-S03: Crear una transacción de gasto', async ({ page }) => {
  const { user, api } = await createUiUser(baseURL);
  try {
    // Pre-condición: categoría creada por API.
    const category = await (await api.post('/api/categories', {
      data: { nombre: 'Supermercado UI', color: '#FF6B6B' },
    })).json();

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(user);
    await loginPage.expectLoggedIn();

    const homePage = new HomePage(page);
    await homePage.navigate();
    await homePage.createExpense('Supermercado UI', 'Compra semanal', 75.5, today());
    await homePage.expectTransactionVisible('Compra semanal');
  } finally {
    await cleanupUiUser(api, user);
  }
});
