import { test, expect, APIRequestContext } from '@playwright/test';
import { createApiContext, registerUser, cleanupAccount } from '../fixtures/apiHelpers';
import { today, currentMonth } from '../fixtures/test-data';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

async function createCategory(api: APIRequestContext, nombre: string, color = '#FF6B6B') {
  const res = await api.post('/api/categories', { data: { nombre, color } });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('Transactions API', () => {
  test('debe crear un gasto con POST /api/transactions', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Gasto test');

      const res = await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Supermercado',
          monto: 50.25,
          categoryId: category.id,
          fecha: today(),
          clasificacion: 'variable',
        },
      });

      expect(res.status()).toBe(201);
      const tx = await res.json();
      expect(tx.tipo).toBe('expense');
      expect(tx.monto).toBe(50.25);
      expect(tx.titulo).toBe('Supermercado');
      expect(tx.categoryId).toBe(category.id);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe crear un ingreso con POST /api/transactions', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const res = await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Salario',
          monto: 1500,
          clasificacion: 'A',
          fecha: today(),
        },
      });

      expect(res.status()).toBe(201);
      const tx = await res.json();
      expect(tx.tipo).toBe('income');
      expect(tx.monto).toBe(1500);
      expect(tx.clasificacion).toBe('A');
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe listar transacciones con GET /api/transactions', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Listado test');

      const created = await (await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Café',
          monto: 25,
          categoryId: category.id,
          fecha: today(),
        },
      })).json();

      const res = await ctx.api.get(`/api/transactions?month=${currentMonth()}`);
      expect(res.status()).toBe(200);
      const list = await res.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((t: any) => t.id === created.id)).toBe(true);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('GET /api/transactions/:id no implementado devuelve HTML fallback', async () => {
    // GAP FUNCIONAL DOCUMENTADO: el backend no expone GET /api/transactions/:id.
    // La petición cae al catch-all del SPA y devuelve index.html en lugar de JSON.
    // Este test documenta el contrato actual para que no se asuma que existe el endpoint.
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Por ID');

      const created = await (await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Libro',
          monto: 45,
          categoryId: category.id,
          fecha: today(),
        },
      })).json();

      const res = await ctx.api.get(`/api/transactions/${created.id}`);
      expect(res.status()).toBe(200);
      const contentType = res.headers()['content-type'] || '';
      expect(contentType).toContain('text/html');
      await expect(res.json()).rejects.toThrow();
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe actualizar monto y descripción con PUT /api/transactions/:id', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Actualizar');

      const created = await (await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Original',
          monto: 100,
          categoryId: category.id,
          fecha: today(),
        },
      })).json();

      const res = await ctx.api.put(`/api/transactions/${created.id}`, {
        data: { monto: 175.5, titulo: 'Actualizado' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json();
      expect(updated.monto).toBe(175.5);
      expect(updated.titulo).toBe('Actualizado');
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe eliminar una transacción con DELETE /api/transactions/:id', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Eliminar');

      const created = await (await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Borrar',
          monto: 30,
          categoryId: category.id,
          fecha: today(),
        },
      })).json();

      const deleteRes = await ctx.api.delete(`/api/transactions/${created.id}`);
      expect(deleteRes.status()).toBe(200);
      expect((await deleteRes.json()).ok).toBe(true);

      const listRes = await ctx.api.get(`/api/transactions?month=${currentMonth()}`);
      const list = await listRes.json();
      expect(list.some((t: any) => t.id === created.id)).toBe(false);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe reflejar ivaPorcentaje en un ingreso', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const res = await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Factura con IVA',
          monto: 1000,
          clasificacion: 'A',
          ivaPorcentaje: 21,
          fecha: today(),
        },
      });

      expect(res.status()).toBe(201);
      const tx = await res.json();
      expect(tx.ivaPorcentaje).toBe(21);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe soportar clasificación Mixto con montoA y montoB', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const res = await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Ingreso mixto',
          monto: 1500,
          clasificacion: 'Mixto',
          montoA: 900,
          montoB: 600,
          fecha: today(),
        },
      });

      expect(res.status()).toBe(201);
      const tx = await res.json();
      expect(tx.clasificacion).toBe('Mixto');
      expect(tx.montoA).toBe(900);
      expect(tx.montoB).toBe(600);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe crear una transacción recurrente mensual y reflejarla en totales', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Recurrente');

      const res = await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Alquiler',
          monto: 800,
          categoryId: category.id,
          fecha: '2020-01-01',
          recurrente: true,
          frecuencia: 'monthly',
        },
      });

      expect(res.status()).toBe(201);
      const tx = await res.json();
      expect(tx.recurrente).toBe(true);
      expect(tx.frecuencia).toBe('monthly');

      const recurringRes = await ctx.api.get(`/api/transactions/recurring-total?month=${currentMonth()}`);
      expect(recurringRes.status()).toBe(200);
      const recurring = await recurringRes.json();
      expect(recurring.total).toBeGreaterThanOrEqual(800);
      expect(recurring.items.some((i: any) => i.titulo === 'Alquiler')).toBe(true);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe aceptar parámetros de filtrado en el listado', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Filtros');

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Gasto filtrable',
          monto: 60,
          categoryId: category.id,
          fecha: today(),
        },
      });

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Ingreso filtrable',
          monto: 500,
          clasificacion: 'A',
          fecha: today(),
        },
      });

      const res = await ctx.api.get(`/api/transactions?month=${currentMonth()}&tipo=expense&categoryId=${category.id}`);
      expect(res.status()).toBe(200);
      const list = await res.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });
});
