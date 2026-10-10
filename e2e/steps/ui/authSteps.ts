import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PateSystemWorld } from '../../support/world';
import { buildTestUser } from '../../fixtures/userFactory';
import { RegisterPage } from '../../pages/RegisterPage';
import { LoginPage } from '../../pages/LoginPage';
import { ProfilePage } from '../../pages/ProfilePage';

Given('que no existe un usuario de prueba', async function (this: PateSystemWorld) {
  this.user = buildTestUser('ui');
});

Then('la experiencia móvil está seleccionada por defecto', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('[data-experience="mobile"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(this.page!.locator('[data-experience="desktop"]')).toHaveAttribute('aria-pressed', 'false');
});

When('selecciono la experiencia de escritorio', async function (this: PateSystemWorld) {
  await this.page!.click('[data-experience="desktop"]');
});

Then('la elección de escritorio queda guardada', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('[data-experience="desktop"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await this.page!.evaluate(() => localStorage.getItem('pate_experience'))).toBe('desktop');
});

Then('la preferencia de escritorio se conserva al recargar', async function (this: PateSystemWorld) {
  await this.page!.reload();
  await expect(this.page!.locator('[data-experience="desktop"]')).toHaveAttribute('aria-pressed', 'true');
});

Then('el inicio muestra las áreas de transacciones y analítica', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('.desktop-home-workspace')).toBeVisible();
  await expect(this.page!.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(this.page!.getByRole('heading', { name: 'Analítica' })).toBeVisible();
  await expect(this.page!.locator('.desktop-home-transactions .month-nav')).toBeVisible();
});

When('abro la página de registro', async function (this: PateSystemWorld) {
  const registerPage = new RegisterPage(this.page!);
  await registerPage.navigate();
});

When('me registro con un nuevo usuario', async function (this: PateSystemWorld) {
  const registerPage = new RegisterPage(this.page!);
  await registerPage.register(this.user!);
  await registerPage.expectRegistered();
});

When('inicio sesión con contraseña {string}', async function (this: PateSystemWorld, password: string) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.attemptLoginWithPassword(this.user!.nombre, password);
});

When('inicio sesión con la contraseña {string}', async function (this: PateSystemWorld, password: string) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.attemptLoginWithPassword(this.user!.nombre, password);
  await loginPage.expectLoggedIn();
});

When('cambio la contraseña a {string}', async function (this: PateSystemWorld, newPassword: string) {
  const profilePage = new ProfilePage(this.page!);
  await profilePage.changePassword(this.user!.password, newPassword);
  this.user!.password = newPassword;
});

When('elimino la cuenta', async function (this: PateSystemWorld) {
  const profilePage = new ProfilePage(this.page!);
  await profilePage.deleteAccount();
});

When('intento iniciar sesión con las credenciales anteriores', async function (this: PateSystemWorld) {
  const loginPage = new LoginPage(this.page!);
  await loginPage.attemptLogin(this.user!);
});
