const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

describe('Trends Routes', () => {
  let db;
  let agent;
  let categoryId;

  beforeEach(async () => {
    db = setupTestDb();
    app.locals.db = db;

    agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ email: 'trend@test.com', password: '123456', nombre: 'Trend User' });

    const catRes = await agent.post('/api/categories').send({ nombre: 'Food', color: '#F00' });
    categoryId = catRes.body.id;
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('GET /api/trends', () => {
    it('should require from and to parameters', async () => {
      const res = await agent.get('/api/trends');
      expect(res.status).toBe(400);
    });

    it('should return monthly data', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 100, titulo: 'Jan', categoryId, fecha: '2024-01-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 200, titulo: 'Feb', categoryId, fecha: '2024-02-15'
      });

      const res = await agent.get('/api/trends?from=2024-01&to=2024-02');
      expect(res.status).toBe(200);
      expect(res.body.monthlyData).toHaveLength(2);
      expect(res.body.monthlyData[0].gastosNetos).toBe(100);
      expect(res.body.monthlyData[1].gastosNetos).toBe(200);
    });

    it('should include category trends', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 50, titulo: 'Mar', categoryId, fecha: '2024-03-15'
      });

      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.body.categoryTrends).toHaveProperty(categoryId);
      expect(res.body.categoryTrends[categoryId].nombre).toBe('Food');
      expect(res.body.categoryTrends[categoryId].months[0].neto).toBe(50);
    });

    it('should filter by category when categoryId is provided', async () => {
      const cat2Res = await agent.post('/api/categories').send({ nombre: 'Transport', color: '#0F0' });
      const cat2Id = cat2Res.body.id;

      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 30, titulo: 'Food', categoryId, fecha: '2024-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 20, titulo: 'Bus', categoryId: cat2Id, fecha: '2024-03-15'
      });

      const res = await agent.get(`/api/trends?from=2024-03&to=2024-03&categoryId=${categoryId}`);
      expect(Object.keys(res.body.categoryTrends)).toHaveLength(1);
      expect(res.body.categoryTrends[categoryId]).toBeDefined();
    });

    it('should include savings in monthly data', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 100, titulo: 'Exp', categoryId, fecha: '2024-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'income', monto: 500, titulo: 'Inc', fecha: '2024-03-20'
      });

      const res = await agent.get('/api/trends?from=2024-03&to=2024-03');
      expect(res.body.monthlyData[0].ahorro).toBe(400);
      expect(res.body.monthlyData[0].ingresos).toBe(500);
    });

    it('should return 404 for non-existent category filter', async () => {
      const res = await agent.get('/api/trends?from=2024-01&to=2024-03&categoryId=nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
