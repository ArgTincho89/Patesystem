import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProfilePage extends BasePage {
  readonly selectors = {
    navbar: '#navbar',
    logoutButton: 'button:has-text("Cerrar sesión")',
    deleteAccountButton: 'button:has-text("Eliminar mi cuenta")',
    confirmInput: '#delete-account-confirm',
    confirmDeleteButton: '.modal-overlay button:has-text("Eliminar mi cuenta")',
    loginForm: '#login-form',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/profile');
    await this.page.waitForSelector(this.selectors.navbar, { state: 'visible' });
  }

  async logout(): Promise<void> {
    await this.page.click(this.selectors.logoutButton);
    await this.page.waitForSelector(this.selectors.loginForm, { state: 'visible' });
  }

  async deleteAccount(): Promise<void> {
    await this.page.click(this.selectors.deleteAccountButton);
    await this.page.fill(this.selectors.confirmInput, 'ELIMINAR');
    await this.page.click(this.selectors.confirmDeleteButton);
    await this.page.waitForSelector(this.selectors.loginForm, { state: 'visible' });
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.page.locator(this.selectors.loginForm)).toBeVisible();
  }
}
