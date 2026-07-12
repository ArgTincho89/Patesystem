const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

describe('Trends Routes', () => {
  let db;
  let agent;
  let categoryId;

  beforeAll(async () => {
    db = setupTestDb();
    app.locals.db = db;

    agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ email: 'trend@test.com', password: '123456', nombre: 'Trend User' });

    const catRes = await agent.post('/api/categories').send({ nombre: 'Food', color: '#F00' });
    categoryId = catRes.body.id;

    await agent.post('/api/transactions').send({
      tipo: 'expense', monto: 100, titulo: 'Jan', categoryId, fecha: '2024-01-15'
    });
    await agent.post('/api/transactions').send({
      tipo: 'expense', monto: 200, titulo: 'Feb', categoryId, fecha: '2024-02-15'
    });
    await agent.post('/api/transactions').send({
      tipo: 'expense', monto: 50, titulo: 'MarFood', categoryId, fecha: '2024-03-15'
    });
    await agent.post('/api/transactions').send({
      tipo: 'income', monto: 500, titulo: 'IncTrend', fecha: '2024-03-20'
    });
    await agent.post('/api/transactions').send({
      tipo: 'refund', monto: 10, titulo: 'TrendRefund', categoryId, fecha: '2024-03-18'
    });
    await agent.post('/api/transactions').send({
      tipo: 'expense', monto: 10.555, titulo: 'RoundTrend', categoryId, fecha: '2024-02-20'
    });
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe('GET /api/trends', () => {
    it('should require from and to parameters', async () => {
      const res = await agent.get('/api/trends');
      expect(res.status).toBe(400);
    });

    it('should require from parameter only', async () => {
      const res = await agent.get('/api/trends?from=2024-01');
      expect(res.status).toBe(400);
    });

    it('should require to parameter only', async () => {
      const res = await agent.get('/api/trends?to=2024-12');
      expect(res.status).toBe(400);
    });

    it('should return monthly data', async () => {
      const res = await agent.get('/api/trends?from=2024-01&to=2024-02');
      expect(res.status).toBe(200);
      expect(res.body.monthlyData).toHaveLength(2);
      expect(res.body.monthlyData[0].gastosNetos).toBe(100);
      expect(res.body.monthlyData[1].gastosNetos).toBeGreaterThan(200);
    });

    it('should include category trends', async () => {
      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.body.categoryTrends).toHaveProperty(categoryId);
      expect(res.body.categoryTrends[categoryId].nombre).toBe('Food');
    });

    it('should filter by category when categoryId is provided', async () => {
      const cat2Res = await agent.post('/api/categories').send({ nombre: 'Transport', color: '#0F0' });
      const cat2Id = cat2Res.body.id;

      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 30, titulo: 'FoodTx', categoryId, fecha: '2025-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 20, titulo: 'Bus', categoryId: cat2Id, fecha: '2025-03-15'
      });

      const res = await agent.get(`/api/trends?from=2025-03&to=2025-03&categoryId=${categoryId}`);
      expect(Object.keys(res.body.categoryTrends)).toHaveLength(1);
      expect(res.body.categoryTrends[categoryId]).toBeDefined();
    });

    it('should return 404 for non-existent category filter', async () => {
      const res = await agent.get('/api/trends?from=2024-01&to=2024-03&categoryId=nonexistent');
      expect(res.status).toBe(404);
    });

    it('should include savings in monthly data', async () => {
      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.body.monthlyData[0].ahorro).toBeGreaterThan(0);
      expect(res.body.monthlyData[0].ingresos).toBe(500);
    });

    it('should handle single month range', async () => {
      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.status).toBe(200);
      expect(res.body.monthlyData).toHaveLength(1);
    });

    it('should include refund data in monthly breakdown', async () => {
      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.body.monthlyData[0].reembolsos).toBe(10);
    });

    it('should only include categories with data in trends', async () => {
      const emptyCatRes = await agent.post('/api/categories').send({ nombre: 'Empty', color: '#999' });
      const res = await agent.get('/api/trends?from=2024-01&to=2024-03');
      expect(res.body.categoryTrends[emptyCatRes.body.id]).toBeUndefined();
    });

    it('should round values to 2 decimals', async () => {
      const res = await agent.get('/api/trends?from=2024-02&to=2024-02');
      expect(res.body.monthlyData[0].gastos).toBe(210.56);
    });
  });
});
