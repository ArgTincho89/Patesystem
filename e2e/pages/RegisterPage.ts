import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestUser } from '../fixtures/userFactory';

export class RegisterPage extends BasePage {
  readonly selectors = {
    tabRegister: '[data-tab="register"]',
    registerForm: '#register-form',
    registerNombre: '#register-nombre',
    registerEmail: '#register-email',
    registerPassword: '#register-password',
    submitRegister: '#register-form button[type="submit"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/login');
    await this.page.waitForSelector('#login-form.active', { state: 'visible' });
    await this.page.click(this.selectors.tabRegister);
    await this.page.waitForSelector('#register-form.active', { state: 'visible' });
  }

  async register(user: TestUser): Promise<void> {
    await this.page.fill(this.selectors.registerNombre, user.nombre);
    await this.page.fill(this.selectors.registerEmail, user.email);
    await this.page.fill(this.selectors.registerPassword, user.password);
    await this.page.click(this.selectors.submitRegister);
  }

  async expectRegistered(): Promise<void> {
    await this.page.waitForSelector('#navbar', { state: 'visible' });
    await this.waitForUrlHash('/home');
  }
}
