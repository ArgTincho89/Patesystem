import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestUser } from '../fixtures/userFactory';

export class LoginPage extends BasePage {
  readonly selectors = {
    tabLogin: '[data-tab="login"]',
    tabRegister: '[data-tab="register"]',
    loginForm: '#login-form',
    registerForm: '#register-form',
    loginNombre: '#login-nombre',
    loginPassword: '#login-password',
    registerNombre: '#register-nombre',
    registerEmail: '#register-email',
    registerPassword: '#register-password',
    submitLogin: '#login-form button[type="submit"]',
    submitRegister: '#register-form button[type="submit"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.goto('/login');
    await this.page.waitForSelector(this.selectors.loginForm, { state: 'visible' });
  }

  async login(user: TestUser): Promise<void> {
    await this.page.fill(this.selectors.loginNombre, user.nombre);
    await this.page.fill(this.selectors.loginPassword, user.password);
    await this.page.click(this.selectors.submitLogin);
  }

  async register(user: TestUser): Promise<void> {
    await this.page.click(this.selectors.tabRegister);
    await this.page.fill(this.selectors.registerNombre, user.nombre);
    await this.page.fill(this.selectors.registerEmail, user.email);
    await this.page.fill(this.selectors.registerPassword, user.password);
    await this.page.click(this.selectors.submitRegister);
  }

  async expectLoggedIn(): Promise<void> {
    // La navegación a /home puede tardar; esperamos un elemento característico.
    await this.page.waitForSelector('#navbar', { state: 'visible', timeout: 10000 });
    await this.page.waitForSelector('.stats-row, .empty-state', { state: 'visible', timeout: 10000 });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.locator(this.selectors.loginForm)).toBeVisible();
  }
}
