import { Page, expect, Locator } from '@playwright/test';
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
    await this.page.waitForLoadState('networkidle');
  }

  async expectSummaryLoaded(): Promise<void> {
    await expect(this.page.locator(this.selectors.statIngresos)).toBeVisible();
    await expect(this.page.locator(this.selectors.statGastos)).toBeVisible();
    await expect(this.page.locator(this.selectors.statAhorro)).toBeVisible();
  }

  async expectIvaBadge(amountText: string): Promise<void> {
    const badge = this.page.locator('.category-badge').filter({ hasText: 'IVA acumulado' });
    await expect(badge).toContainText(amountText);
  }

  async expectChartTitle(title: string): Promise<void> {
    await expect(this.page.locator('.chart-title').filter({ hasText: title })).toBeVisible();
  }

  async expectFvLegendContains(text: string): Promise<void> {
    const legend = this.page.locator('.fv-legend');
    await expect(legend).toContainText(text);
  }

  async expectIncomeABLegendContains(text: string): Promise<void> {
    const card = this.page.locator('.chart-container').filter({ hasText: 'Ingresos A vs B' });
    await expect(card.locator('.fv-legend')).toContainText(text);
  }

  async expectCategoryBar(categoryName: string, amountText: string): Promise<void> {
    const section = this.page.locator('.summary-section');
    const row = section.locator('div').filter({ hasText: categoryName }).first();
    await expect(row).toContainText(amountText);
    await expect(row.locator('.category-bar-fill')).toBeVisible();
  }

  async expectGoalProgressLabel(label: string): Promise<void> {
    await expect(this.page.locator('.goal-progress-card').filter({ hasText: label })).toBeVisible();
  }

  async expectGoalProgressPercentage(label: string, percentage: string): Promise<void> {
    const card = this.page.locator('.goal-progress-card').filter({ hasText: label });
    await expect(card.locator('.goal-progress-pct')).toContainText(percentage);
  }
}
