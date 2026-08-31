import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

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

  async openNewTransaction(): Promise<void> {
    await this.page.locator(this.selectors.fab).click();
    await expect(this.page.locator(this.selectors.modalTitle)).toContainText('Nueva transacción');
  }

  async createExpense(categoryName: string, titulo: string, monto: number, fecha?: string): Promise<void> {
    await this.openNewTransaction();

    const modal = this.page.locator(this.selectors.modalOverlay);

    // Asegurar que el modal está renderizado.
    await modal.locator('.type-btn').first().waitFor({ state: 'visible' });

    // Seleccionar tipo expense si no está activo.
    const expenseBtn = modal.locator('.type-btn[data-type="expense"]');
    const isActive = await expenseBtn.evaluate((el) => el.classList.contains('active')).catch(() => false);
    if (!isActive) {
      await expenseBtn.click();
    }

    // Categoría: primer select visible (el de categoría se oculta para income).
    const categorySelect = modal.locator('select.form-control').first();
    await categorySelect.waitFor({ state: 'visible' });
    await categorySelect.selectOption({ label: categoryName });

    // Título
    const textInput = modal.locator('input.form-control[type="text"]');
    await textInput.fill(titulo);

    // Monto
    const numberInputs = modal.locator('input.form-control[type="number"]');
    await numberInputs.nth(0).fill(String(monto));

    // Fecha
    if (fecha) {
      await modal.locator('input.form-control[type="date"]').first().fill(fecha);
    }

    // Guardar
    await modal.locator('button[type="submit"]').click();

    // Esperar a que el modal desaparezca.
    await this.page.waitForSelector(this.selectors.modalOverlay, { state: 'hidden', timeout: 10000 });
  }

  async expectTransactionVisible(titulo: string): Promise<void> {
    await expect(
      this.page.locator(this.selectors.transactionTitle).filter({ hasText: titulo }).first()
    ).toBeVisible();
  }
}
