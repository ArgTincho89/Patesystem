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
