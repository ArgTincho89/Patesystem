import { test, expect } from '@playwright/test';
import { createApiContext, registerUser, cleanupAccount } from '../fixtures/apiHelpers';
import { currentMonth, today } from '../fixtures/test-data';

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.E2E_PORT || 3001}`;

async function createCategory(api: any, nombre: string, color = '#4ECDC4') {
  const res = await api.post('/api/categories', { data: { nombre, color } });
  expect(res.status()).toBe(201);
  return res.json();
}

test.describe('Summary API', () => {
  test('resumen mensual vacío devuelve totales en cero', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      const res = await ctx.api.get(`/api/summary?month=${currentMonth()}`);
      expect(res.status()).toBe(200);

      const summary = await res.json();
      expect(summary.month).toBe(currentMonth());
      expect(summary.ingresos).toBe(0);
      expect(summary.ingresosA).toBe(0);
      expect(summary.ingresosB).toBe(0);
      expect(summary.ivaAcumulado).toBe(0);
      expect(summary.gastos).toBe(0);
      expect(summary.gastosNetos).toBe(0);
      expect(summary.ahorro).toBe(0);
      expect(summary.fijos).toBe(0);
      expect(summary.variables).toBe(0);
      expect(Array.isArray(summary.porCategoria)).toBe(true);
      expect(summary.porCategoria).toHaveLength(0);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('resumen con ingresos y gastos suma correctamente', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Gastos varios');

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Sueldo',
          monto: 3000,
          clasificacion: 'A',
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Supermercado',
          monto: 500,
          categoryId: category.id,
          clasificacion: 'variable',
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Alquiler',
          monto: 800,
          categoryId: category.id,
          clasificacion: 'fijo',
          fecha: today(),
        },
      });

      const res = await ctx.api.get(`/api/summary?month=${currentMonth()}`);
      expect(res.status()).toBe(200);

      const summary = await res.json();
      expect(summary.ingresos).toBe(3000);
      expect(summary.gastos).toBe(1300);
      expect(summary.gastosNetos).toBe(1300);
      expect(summary.ahorro).toBe(1700);
      expect(summary.fijos).toBe(800);
      expect(summary.variables).toBe(500);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('resumen con IVA acumulado solo aplica a la parte A', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Factura A',
          monto: 1000,
          clasificacion: 'A',
          ivaPorcentaje: 21,
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Factura B',
          monto: 1000,
          clasificacion: 'B',
          fecha: today(),
        },
      });

      const res = await ctx.api.get(`/api/summary?month=${currentMonth()}`);
      expect(res.status()).toBe(200);

      const summary = await res.json();
      expect(summary.ingresos).toBe(2000);
      expect(summary.ingresosA).toBe(1000);
      expect(summary.ingresosB).toBe(1000);
      expect(summary.ivaAcumulado).toBe(210);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('resumen con clasificación A, B y Mixto desglosa correctamente', async () => {
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Ingreso A',
          monto: 1000,
          clasificacion: 'A',
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Ingreso B',
          monto: 2000,
          clasificacion: 'B',
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Ingreso Mixto',
          monto: 1500,
          clasificacion: 'Mixto',
          montoA: 900,
          montoB: 600,
          fecha: today(),
        },
      });

      const res = await ctx.api.get(`/api/summary?month=${currentMonth()}`);
      expect(res.status()).toBe(200);

      const summary = await res.json();
      expect(summary.ingresos).toBe(4500);
      expect(summary.ingresosA).toBe(1900);
      expect(summary.ingresosB).toBe(2600);
      expect(summary.ingresosDesglose.A).toBe(1900);
      expect(summary.ingresosDesglose.B).toBe(2600);
      expect(summary.porcentajeA).toBeCloseTo(42.22, 2);
      expect(summary.porcentajeB).toBeCloseTo(57.78, 2);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });

  test('resumen no expone metas; el frontend tiene los datos para calcularlas', async () => {
    // GAP FUNCIONAL DOCUMENTADO: GET /api/summary no incluye `metas`.
    // El frontend las calcula combinando /api/summary + /api/goals.
    // Este test valida el contrato actual: ambos endpoints devuelven los datos
    // necesarios para que el UI muestre el progreso de metas.
    const ctx = await createApiContext(baseURL);
    try {
      await registerUser(ctx.api, ctx.user);
      const category = await createCategory(ctx.api, 'Gastos controlados');

      await ctx.api.post('/api/goals', {
        data: {
          tipo: 'ahorro_mensual',
          modo: 'monto_fijo',
          montoFijo: 500,
          meses: [currentMonth()],
        },
      });
      await ctx.api.post('/api/goals', {
        data: {
          tipo: 'gasto_categoria',
          modo: 'monto_fijo',
          montoFijo: 200,
          categoryId: category.id,
          categoryName: category.nombre,
          meses: [currentMonth()],
        },
      });

      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'income',
          titulo: 'Sueldo',
          monto: 3000,
          clasificacion: 'A',
          fecha: today(),
        },
      });
      await ctx.api.post('/api/transactions', {
        data: {
          tipo: 'expense',
          titulo: 'Gasto en categoría controlada',
          monto: 150,
          categoryId: category.id,
          clasificacion: 'variable',
          fecha: today(),
        },
      });

      const summaryRes = await ctx.api.get(`/api/summary?month=${currentMonth()}`);
      expect(summaryRes.status()).toBe(200);
      const summary = await summaryRes.json();

      const goalsRes = await ctx.api.get(`/api/goals?month=${currentMonth()}`);
      expect(goalsRes.status()).toBe(200);
      const goals = await goalsRes.json();

      expect(summary.ahorro).toBe(2850);
      expect(summary.gastosNetos).toBe(150);
      expect(summary.metas).toBeUndefined();

      expect(goals.some((g: any) => g.tipo === 'ahorro_mensual' && g.montoFijo === 500)).toBe(true);
      expect(goals.some((g: any) => g.tipo === 'gasto_categoria' && g.categoryId === category.id)).toBe(true);

      const categorySummary = summary.porCategoria.find((c: any) => c.categoryId === category.id);
      expect(categorySummary).toBeDefined();
      expect(categorySummary.neto).toBe(150);
    } finally {
      await cleanupAccount(ctx.api, ctx.user);
      await ctx.api.dispose();
    }
  });
});
