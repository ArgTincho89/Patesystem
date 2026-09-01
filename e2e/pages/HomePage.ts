import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { TransactionForm, TransactionFormData } from './TransactionForm';

export class HomePage extends BasePage {
  readonly selectors = {
    navbar: '#navbar',
    statsRow: '.stats-row',
    statCard: '.stat-card',
    fab: '.fab',
    modalOverlay: '.modal-overlay',
    modalTitle: '.modal-overlay h3',
    typeExpense: '[data-type="expense"]',
    saveButton: 'button:has-text("Guardar")',
    transactionItem: '.transaction-item',
    transactionTitle: '.transaction-title',
    emptyState: '.empty-state',
    emptyStateText: '.empty-state-text',
    eyeToggle: '.eye-toggle-btn',
    monthNav: '.month-nav',
    monthLabel: '.month-nav h2',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/home');
    await this.page.waitForSelector(this.selectors.navbar, { state: 'visible' });
    // Esperar a que el contenido principal de la home esté renderizado antes de interactuar.
    await Promise.race([
      this.page.waitForSelector(this.selectors.statsRow, { state: 'visible' }),
      this.page.waitForSelector(this.selectors.emptyState, { state: 'visible' }),
    ]);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator(this.selectors.statsRow)).toBeVisible();
  }

  async openNewTransaction(): Promise<TransactionForm> {
    const fab = this.page.locator(this.selectors.fab);
    await fab.waitFor({ state: 'visible' });
    for (let attempt = 0; attempt < 3; attempt++) {
      await fab.click();
      try {
        await expect(this.page.locator(this.selectors.modalTitle)).toContainText('Nueva transacción', { timeout: 2000 });
        return new TransactionForm(this.page);
      } catch {
        if (attempt === 2) throw new Error('El modal de nueva transacción no se abrió tras hacer clic en el FAB');
        await this.page.waitForTimeout(300);
      }
    }
    throw new Error('El modal de nueva transacción no se abrió');
  }

  async submitTransaction(data: TransactionFormData): Promise<void> {
    const form = await this.openNewTransaction();
    await form.submit(data);
  }

  async createExpense(categoryName: string, titulo: string, monto: number, fecha?: string, clasificacion: 'fijo' | 'variable' = 'variable'): Promise<void> {
    await this.submitTransaction({
      tipo: 'expense',
      categoryName,
      titulo,
      monto,
      fecha,
      clasificacion,
    });
  }

  async expectTransactionVisible(titulo: string): Promise<void> {
    await expect(
      this.page.locator(this.selectors.transactionTitle).filter({ hasText: titulo }).first()
    ).toBeVisible();
  }

  async expectTransactionNotVisible(titulo: string): Promise<void> {
    await expect(
      this.page.locator(this.selectors.transactionTitle).filter({ hasText: titulo })
    ).toHaveCount(0);
  }

  private statCard(label: string): Locator {
    return this.page.locator('.stat-card').filter({ hasText: label });
  }

  async getStatValue(label: string): Promise<string> {
    const value = this.statCard(label).locator('.stat-value');
    await expect(value).toBeVisible();
    return value.innerText();
  }

  async expectStatContains(label: string, text: string): Promise<void> {
    await expect(this.statCard(label).locator('.stat-value')).toContainText(text);
  }

  async toggleEye(): Promise<void> {
    const btn = this.page.locator(this.selectors.eyeToggle);
    await btn.waitFor({ state: 'visible' });
    await btn.click();
  }

  async expectValuesBlurred(): Promise<void> {
    await expect(this.statCard('Ingresos').locator('.stat-value')).toHaveClass(/income-blurred/);
    await expect(this.statCard('Ahorro').locator('.stat-value')).toHaveClass(/income-blurred/);
  }

  async expectValuesNotBlurred(): Promise<void> {
    await expect(this.statCard('Ingresos').locator('.stat-value')).not.toHaveClass(/income-blurred/);
    await expect(this.statCard('Ahorro').locator('.stat-value')).not.toHaveClass(/income-blurred/);
  }

  async navigateMonth(direction: 'prev' | 'next'): Promise<void> {
    const nav = this.page.locator(this.selectors.monthNav);
    await nav.waitFor({ state: 'visible' });
    const button = nav.locator('button').nth(direction === 'prev' ? 0 : 1);
    await button.click({ force: true });
    // Wait for the page data to refresh after month change.
    await this.page.waitForLoadState('networkidle');
  }

  async getMonthLabel(): Promise<string> {
    return this.page.locator(this.selectors.monthLabel).innerText();
  }

  async createIncome(titulo: string, monto: number, clasificacion: 'A' | 'B' | 'Mixto', options: { fecha?: string; montoA?: number; montoB?: number; ivaPorcentaje?: number } = {}): Promise<void> {
    await this.submitTransaction({
      tipo: 'income',
      titulo,
      monto,
      fecha: options.fecha,
      clasificacion,
      montoA: options.montoA,
      montoB: options.montoB,
      ivaPorcentaje: options.ivaPorcentaje,
    });
  }

  async createRefund(categoryName: string, titulo: string, monto: number, fecha?: string): Promise<void> {
    await this.submitTransaction({
      tipo: 'refund',
      categoryName,
      titulo,
      monto,
      fecha,
    });
  }

  async createRecurringExpense(categoryName: string, titulo: string, monto: number, fecha?: string, clasificacion: 'fijo' | 'variable' = 'fijo'): Promise<void> {
    await this.submitTransaction({
      tipo: 'expense',
      categoryName,
      titulo,
      monto,
      fecha,
      clasificacion,
      recurrent: true,
      frecuencia: 'monthly',
      indeterminado: true,
    });
  }

  private async openTransactionOptions(titulo: string): Promise<void> {
    const item = this.page.locator(this.selectors.transactionItem).filter({ hasText: titulo });
    await item.waitFor({ state: 'visible' });
    await item.click();
    await expect(this.page.locator('.modal-overlay h3')).toContainText('Transacción', { timeout: 5000 });
  }

  async editTransaction(titulo: string, nuevoTitulo: string, nuevoMonto?: number): Promise<void> {
    await this.openTransactionOptions(titulo);
    await this.page.locator('.modal-overlay button:has-text("Editar")').click();
    const form = new TransactionForm(this.page);
    await form.waitForOpen();
    if (nuevoTitulo) {
      await form.fillTitle(nuevoTitulo);
    }
    if (nuevoMonto !== undefined) {
      await form.fillAmount(nuevoMonto);
    }
    await form.save();
  }

  async deleteTransaction(titulo: string): Promise<void> {
    await this.openTransactionOptions(titulo);
    await this.page.locator('.modal-overlay button:has-text("Eliminar")').click();
    // Wait for the list to refresh and the item to disappear.
    await this.expectTransactionNotVisible(titulo);
  }
}
