import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PateSystemWorld } from '../../support/world';
import { currentMonth, today } from '../../fixtures/test-data';

function getCategory(world: PateSystemWorld, nombre: string): any {
  if (world.lastResponseBody?.nombre === nombre) return world.lastResponseBody;
  const found = world.createdCategories.get(nombre);
  if (found) return found;
  throw new Error(`Categoría "${nombre}" no encontrada`);
}

Given('que existe una categoría {string}', async function (this: PateSystemWorld, nombre: string) {
  const res = await this.api!.post('/api/categories', {
    data: { nombre, color: '#FF6B6B' },
  });
  expect(res.status()).toBe(201);
  const category = await res.json();
  this.createdCategories.set(nombre, category);
});

When('creo una categoría llamada {string} con color {string}', async function (this: PateSystemWorld, nombre: string, color: string) {
  this.lastResponse = await this.api!.post('/api/categories', { data: { nombre, color } });
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
  if (this.lastResponseBody?.id) {
    this.createdCategories.set(nombre, this.lastResponseBody);
  }
});

When('creo una categoría con color {string} sin nombre', async function (this: PateSystemWorld, color: string) {
  this.lastResponse = await this.api!.post('/api/categories', { data: { color } });
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
});

When('actualizo la categoría a nombre {string}', async function (this: PateSystemWorld, nombre: string) {
  const id = this.lastResponseBody.id;
  this.lastResponse = await this.api!.put(`/api/categories/${id}`, { data: { nombre } });
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
  if (this.lastResponseBody?.nombre) {
    // Actualizamos el mapa con la categoría modificada usando el nuevo nombre como clave.
    this.createdCategories.set(nombre, this.lastResponseBody);
  }
});

When('elimino la categoría', async function (this: PateSystemWorld) {
  const id = this.lastResponseBody.id;
  this.lastResponse = await this.api!.delete(`/api/categories/${id}`);
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
});

When('elimino la categoría {string}', async function (this: PateSystemWorld, nombre: string) {
  const id = getCategory(this, nombre).id;
  this.lastResponse = await this.api!.delete(`/api/categories/${id}`);
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
});

When('creo una subcategoría {string} bajo {string}', async function (this: PateSystemWorld, childName: string, parentName: string) {
  const parent = getCategory(this, parentName);
  this.lastResponse = await this.api!.post('/api/categories', {
    data: { nombre: childName, color: '#FFE66D', parentId: parent.id },
  });
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
  if (this.lastResponseBody?.id) {
    this.createdCategories.set(childName, this.lastResponseBody);
  }
});

When('intento crear una subcategoría bajo {string}', async function (this: PateSystemWorld, parentName: string) {
  const parent = getCategory(this, parentName);
  this.lastResponse = await this.api!.post('/api/categories', {
    data: { nombre: 'Nieto', color: '#FF6B6B', parentId: parent.id },
  });
  this.lastResponseBody = await this.lastResponse.json().catch(() => null);
});

When('creo un gasto de {float} en la categoría {string}', async function (this: PateSystemWorld, monto: number, nombre: string) {
  const category = getCategory(this, nombre);
  const res = await this.api!.post('/api/transactions', {
    data: {
      tipo: 'expense',
      monto,
      categoryId: category.id,
      fecha: today(),
    },
  });
  expect(res.status()).toBe(201);
});

Then('la categoría tiene nombre {string}', async function (this: PateSystemWorld, nombre: string) {
  expect(this.lastResponseBody.nombre).toBe(nombre);
});

Then('la categoría aparece en el listado', async function (this: PateSystemWorld) {
  const id = this.lastResponseBody.id;
  const res = await this.api!.get('/api/categories');
  expect(res.status()).toBe(200);
  const list = await res.json();
  expect(list.some((c: any) => c.id === id)).toBe(true);
});

Then('la subcategoría tiene como padre a {string}', async function (this: PateSystemWorld, parentName: string) {
  const parent = getCategory(this, parentName);
  expect(this.lastResponseBody.parentId).toBe(parent.id);
});

Then('la subcategoría aparece en el listado', async function (this: PateSystemWorld) {
  const id = this.lastResponseBody.id;
  const res = await this.api!.get('/api/categories');
  expect(res.status()).toBe(200);
  const list = await res.json();
  expect(list.some((c: any) => c.id === id)).toBe(true);
});
