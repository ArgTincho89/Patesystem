import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SummaryPage extends BasePage {
  readonly selectors = {
    navbar: '#navbar',
    summarySection: '.summary-section',
    statIngresos: '.stat-card:has-text("Ingresos")',
    statGastos: '.stat-card:has-text("Gastos")',
    statAhorro: '.stat-card:has-text("Ahorro")',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/summary');
    await this.page.waitForSelector(this.selectors.navbar, { state: 'visible' });
  }

  async expectSummaryLoaded(): Promise<void> {
    await expect(this.page.locator(this.selectors.statIngresos)).toBeVisible();
    await expect(this.page.locator(this.selectors.statGastos)).toBeVisible();
    await expect(this.page.locator(this.selectors.statAhorro)).toBeVisible();
  }
}
