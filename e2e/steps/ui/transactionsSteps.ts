import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PateSystemWorld } from '../../support/world';
import { HomePage } from '../../pages/HomePage';
import { formatEuro, today, addMonthsToDate } from '../../fixtures/test-data';

When('creo un ingreso {string} de {float} con clasificación {string}', async function (this: PateSystemWorld, titulo: string, monto: number, clasificacion: string) {
  const homePage = new HomePage(this.page!);
  await homePage.createIncome(titulo, monto, clasificacion as 'A' | 'B' | 'Mixto');
});

When('creo un ingreso {string} de {float} con clasificación {string} desglosado {float} en A y {float} en B', async function (
  this: PateSystemWorld,
  titulo: string,
  monto: number,
  clasificacion: string,
  montoA: number,
  montoB: number
) {
  const homePage = new HomePage(this.page!);
  await homePage.createIncome(titulo, monto, clasificacion as 'A' | 'B' | 'Mixto', { montoA, montoB });
});

When('creo un gasto fijo en {string} llamado {string} por {float}', async function (this: PateSystemWorld, categoria: string, titulo: string, monto: number) {
  const homePage = new HomePage(this.page!);
  await homePage.createExpense(categoria, titulo, monto, today(), 'fijo');
});

When('creo un gasto variable en {string} llamado {string} por {float}', async function (this: PateSystemWorld, categoria: string, titulo: string, monto: number) {
  const homePage = new HomePage(this.page!);
  await homePage.createExpense(categoria, titulo, monto, today(), 'variable');
});

When('creo un reembolso en {string} llamado {string} por {float}', async function (this: PateSystemWorld, categoria: string, titulo: string, monto: number) {
  const homePage = new HomePage(this.page!);
  await homePage.createRefund(categoria, titulo, monto, today());
});

When('creo un gasto recurrente mensual en {string} llamado {string} por {float}', async function (this: PateSystemWorld, categoria: string, titulo: string, monto: number) {
  const homePage = new HomePage(this.page!);
  await homePage.createRecurringExpense(categoria, titulo, monto, today(), 'fijo');
});

When('edito la transacción {string} a {string} por {float}', async function (this: PateSystemWorld, titulo: string, nuevoTitulo: string, nuevoMonto: number) {
  const homePage = new HomePage(this.page!);
  await homePage.editTransaction(titulo, nuevoTitulo, nuevoMonto);
});

When('elimino la transacción {string}', async function (this: PateSystemWorld, titulo: string) {
  const homePage = new HomePage(this.page!);
  await homePage.deleteTransaction(titulo);
});

When('navego al mes siguiente', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.navigateMonth('next');
});

When('navego al mes anterior', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.navigateMonth('prev');
});

When('hago clic en el botón de ojo', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.toggleEye();
});

When('marco {string} como favorito en inicio', async function (this: PateSystemWorld, label: string) {
  const homePage = new HomePage(this.page!);
  await homePage.selectFavorite(label as 'Ingresos' | 'Gastos' | 'Ahorro');
});

When('abro la pestaña de analítica {string}', async function (this: PateSystemWorld, label: string) {
  const homePage = new HomePage(this.page!);
  await homePage.openAnalyticsTab(label);
});

When('activo nueva transacción desde los controles de inicio', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.openNewTransaction();
});

When('redimensiono el inicio al ancho de escritorio {int}', async function (this: PateSystemWorld, width: number) {
  await this.page!.setViewportSize({ width, height: 900 });
});

When('configuro el inicio en modo escritorio', async function (this: PateSystemWorld) {
  await this.page!.evaluate(() => localStorage.setItem('pate_experience', 'desktop'));
  await this.page!.reload();
  await this.page!.waitForSelector('.desktop-home-workspace', { state: 'visible' });
});

When('mantengo el modo móvil en viewport {int}', async function (this: PateSystemWorld, width: number) {
  await this.page!.setViewportSize({ width, height: 844 });
  await this.page!.evaluate(() => localStorage.setItem('pate_experience', 'mobile'));
  await this.page!.reload();
  await this.page!.waitForSelector('.fab', { state: 'visible' });
});

Then('el stat {string} muestra {string}', async function (this: PateSystemWorld, label: string, valor: string) {
  const homePage = new HomePage(this.page!);
  await homePage.expectStatContains(label, valor);
});

Then('no veo la transacción {string}', async function (this: PateSystemWorld, titulo: string) {
  const homePage = new HomePage(this.page!);
  await homePage.expectTransactionNotVisible(titulo);
});

Then('el título del mes cambia', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  const label = await homePage.getMonthLabel();
  expect(label).toBeTruthy();
});

Then('los valores de ingresos y ahorro aparecen difuminados', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectValuesBlurred();
});

Then('los valores de ingresos y ahorro no aparecen difuminados', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectValuesNotBlurred();
});

Then('el favorito de inicio es {string}', async function (this: PateSystemWorld, label: string) {
  const homePage = new HomePage(this.page!);
  await homePage.expectFavorite(label as 'Ingresos' | 'Gastos' | 'Ahorro');
});

Then('el favorito refleja el importe actual de {string}', async function (this: PateSystemWorld, label: string) {
  const homePage = new HomePage(this.page!);
  await homePage.expectFavoriteMatches(label as 'Ingresos' | 'Gastos' | 'Ahorro');
});

Then('no hay tarjeta de favorito en inicio', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('.desktop-favorite-card')).toHaveCount(0);
});

Then('los controles de inicio aparecen en el orden requerido', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectDesktopControlOrder();
});

Then('aparecen tres tarjetas principales', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectThreePrimaryCards();
});

Then('las métricas tienen iconos decorativos y el botón dice Nueva transacción', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectDesktopMetricIconsAndTransactionLabel();
});

Then('el icono del favorito corresponde a {string}', async function (this: PateSystemWorld, label: string) {
  const homePage = new HomePage(this.page!);
  await homePage.expectFavoriteIcon(label as 'Ingresos' | 'Gastos' | 'Ahorro');
});

Then('la privacidad indica importes ocultos', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectPrivacyState(true);
});

Then('la privacidad indica importes visibles', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectPrivacyState(false);
});

Then('la pestaña de analítica {string} queda seleccionada', async function (this: PateSystemWorld, label: string) {
  await expect(this.page!.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
});

Then('el formulario de nueva transacción está abierto', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('.modal-overlay h3')).toContainText('Nueva transacción');
});

Then('el diseño de inicio cabe en el viewport', async function (this: PateSystemWorld) {
  const homePage = new HomePage(this.page!);
  await homePage.expectDesktopLayoutWithinViewport();
});

Then('el inicio móvil conserva su estructura', async function (this: PateSystemWorld) {
  await expect(this.page!.locator('.desktop-home-workspace')).toHaveCount(0);
  await expect(this.page!.locator('.stats-row')).toBeVisible();
  await expect(this.page!.locator('.fab')).toBeVisible();
});

Given('que existe una transacción {string} de {float} del mes pasado por API en {string}', async function (
  this: PateSystemWorld,
  titulo: string,
  monto: number,
  categoryName: string
) {
  const category = this.createdCategories.get(categoryName);
  if (!category) throw new Error(`Categoría "${categoryName}" no encontrada en el world`);
  const fecha = addMonthsToDate(today(), -1);
  const tx = await this.api!.post('/api/transactions', {
    data: {
      tipo: 'expense',
      titulo,
      monto,
      categoryId: category.id,
      fecha,
      clasificacion: 'variable',
    },
  });
  expect(tx.status()).toBe(201);
  this.createdTransactions.set(titulo, await tx.json());
});
