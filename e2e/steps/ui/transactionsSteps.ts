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
