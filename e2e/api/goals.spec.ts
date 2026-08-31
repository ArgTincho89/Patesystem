import { test, expect } from '@playwright/test';
import { createApiContext, registerUser, cleanupAccount } from '../fixtures/apiHelpers';
import { currentMonth } from '../fixtures/test-data';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test.describe('API - Goals', () => {
  test('debe crear, listar y eliminar una meta de ahorro', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const createRes = await ctx.api.post('/api/goals', {
        data: {
          tipo: 'ahorro_mensual',
          modo: 'monto_fijo',
          montoFijo: 500,
          meses: [currentMonth()],
        },
      });
      expect(createRes.status()).toBe(201);
      const goal = await createRes.json();
      expect(goal.tipo).toBe('ahorro_mensual');
      expect(goal.modo).toBe('monto_fijo');
      expect(goal.montoFijo).toBe(500);

      const listRes = await ctx.api.get(`/api/goals?month=${currentMonth()}`);
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      expect(list.some((g: any) => g.id === goal.id)).toBe(true);

      const deleteRes = await ctx.api.delete(`/api/goals/${goal.id}`);
      expect(deleteRes.status()).toBe(200);

      const listAfter = await ctx.api.get(`/api/goals?month=${currentMonth()}`);
      expect((await listAfter.json()).some((g: any) => g.id === goal.id)).toBe(false);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe rechazar meta sin meses', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const res = await ctx.api.post('/api/goals', {
        data: { tipo: 'ahorro_mensual', modo: 'monto_fijo', montoFijo: 100, meses: [] },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe crear meta de límite de gasto por categoría', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await (await ctx.api.post('/api/categories', {
        data: { nombre: 'Transporte', color: '#FFE66D' },
      })).json();

      const createRes = await ctx.api.post('/api/goals', {
        data: {
          tipo: 'gasto_categoria',
          modo: 'monto_fijo',
          montoFijo: 200,
          categoryId: category.id,
          categoryName: category.nombre,
          meses: [currentMonth()],
        },
      });
      expect(createRes.status()).toBe(201);
      const goal = await createRes.json();
      expect(goal.tipo).toBe('gasto_categoria');
      expect(goal.categoryId).toBe(category.id);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });
});
