import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { SummaryPage } from '../pages/SummaryPage';
import { ProfilePage } from '../pages/ProfilePage';
import { buildTestUser, TestUser } from '../fixtures/userFactory';
import { today } from '../fixtures/test-data';
import { authenticatePage } from '../fixtures/authHelpers';

test.describe('Smoke UI', () => {
  test('E2E-SMOKE-01: Health check - la app carga /login sin errores críticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // 401 al cargar /login es esperado para usuario no autenticado.
        if (text.includes('401 (Unauthorized)')) return;
        errors.push(text);
      }
    });

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.expectVisible();

    expect(errors).toHaveLength(0);
  });

  test.describe('autenticado', () => {
    let user: TestUser;

    test.beforeEach(async ({ page, request }) => {
      user = buildTestUser('smoke');
      const registerRes = await request.post('/api/auth/register', { data: user });
      if (registerRes.status() !== 201) {
        throw new Error(`Setup register failed: ${registerRes.status()} ${await registerRes.text()}`);
      }

      await authenticatePage(page, user);
      await page.goto('/#/home');
      await page.waitForSelector('#navbar', { state: 'visible' });
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async ({ request }) => {
      try {
        await request.post('/api/auth/login', {
          data: { nombre: user.nombre, password: user.password },
        });
        await request.delete('/api/auth/account');
      } catch {
        // Best-effort cleanup.
      }
    });

    test('E2E-SMOKE-03: Crear transacción de gasto', async ({ page, request }) => {
      const categoryRes = await request.post('/api/categories', {
        data: { nombre: 'Supermercado Smoke', color: '#FF6B6B' },
      });
      if (categoryRes.status() !== 201) {
        throw new Error(`Category setup failed: ${categoryRes.status()} ${await categoryRes.text()}`);
      }

      // Ya estamos en /home desde el beforeEach; no hace falta navegar de nuevo.
      await page.waitForSelector('.fab', { state: 'visible' });
      const homePage = new HomePage(page);
      await homePage.createExpense('Supermercado Smoke', 'Gasto smoke', 42.5, today());
      await homePage.expectTransactionVisible('Gasto smoke');
    });

    test('E2E-SMOKE-04: Ver resumen del mes', async ({ page }) => {
      const summaryPage = new SummaryPage(page);
      await summaryPage.navigate();
      await summaryPage.expectSummaryLoaded();
    });

    test('E2E-SMOKE-05: Logout', async ({ page }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.navigate();
      await profilePage.logout();
      await profilePage.expectLoggedOut();
    });
  });
});
