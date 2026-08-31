import { test, expect } from '@playwright/test';
import { createApiContext, registerUser, cleanupAccount } from '../fixtures/apiHelpers';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

test.describe('API - Categories', () => {
  test('debe crear, listar, actualizar y eliminar una categoría', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const createRes = await ctx.api.post('/api/categories', {
        data: { nombre: 'Categoría test', color: '#FF6B6B' },
      });
      expect(createRes.status()).toBe(201);
      const category = await createRes.json();
      expect(category.nombre).toBe('Categoría test');

      const listRes = await ctx.api.get('/api/categories');
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      expect(list.some((c: any) => c.id === category.id)).toBe(true);

      const updateRes = await ctx.api.put(`/api/categories/${category.id}`, {
        data: { nombre: 'Categoría actualizada' },
      });
      expect(updateRes.status()).toBe(200);
      expect((await updateRes.json()).nombre).toBe('Categoría actualizada');

      const deleteRes = await ctx.api.delete(`/api/categories/${category.id}`);
      expect(deleteRes.status()).toBe(200);
      expect((await deleteRes.json()).ok).toBe(true);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe soportar jerarquía padre/hijo', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const parent = await (await ctx.api.post('/api/categories', {
        data: { nombre: 'Hogar', color: '#4ECDC4' },
      })).json();

      const child = await (await ctx.api.post('/api/categories', {
        data: { nombre: 'Supermercado', color: '#FFE66D', parentId: parent.id },
      })).json();
      expect(child.parentId).toBe(parent.id);

      const grandchildRes = await ctx.api.post('/api/categories', {
        data: { nombre: 'Nieto', color: '#FF6B6B', parentId: child.id },
      });
      expect(grandchildRes.status()).toBe(400);

      const listRes = await ctx.api.get('/api/categories');
      const list = await listRes.json();
      expect(list.some((c: any) => c.id === child.id && c.parentId === parent.id)).toBe(true);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe rechazar categoría sin nombre', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const res = await ctx.api.post('/api/categories', { data: { color: '#FF6B6B' } });
      expect(res.status()).toBe(400);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('debe rechazar eliminar categoría con transacciones asociadas', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await (await ctx.api.post('/api/categories', {
        data: { nombre: 'No borrable', color: '#FF6B6B' },
      })).json();

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          monto: 10,
          categoryId: category.id,
          fecha: new Date().toISOString().split('T')[0],
        },
      });

      const deleteRes = await ctx.api.delete(`/api/categories/${category.id}`);
      expect(deleteRes.status()).toBe(409);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });
});
