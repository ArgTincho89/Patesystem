const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

describe('Summary Routes', () => {
  let db;
  let agent;
  let categoryId;

  beforeEach(async () => {
    db = setupTestDb();
    app.locals.db = db;

    agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ email: 'sum@test.com', password: '123456', nombre: 'Sum User' });

    const catRes = await agent.post('/api/categories').send({ nombre: 'Food', color: '#F00' });
    categoryId = catRes.body.id;
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('GET /api/summary', () => {
    it('should return empty summary for month with no data', async () => {
      const res = await agent.get('/api/summary?month=2024-03');
      expect(res.status).toBe(200);
      expect(res.body.ingresos).toBe(0);
      expect(res.body.gastosNetos).toBe(0);
      expect(res.body.ahorro).toBe(0);
    });

    it('should require month parameter', async () => {
      const res = await agent.get('/api/summary');
      expect(res.status).toBe(400);
    });

    it('should calculate summary correctly with expenses and refunds', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 50, titulo: 'Super', categoryId, fecha: '2024-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'refund', monto: 15, titulo: 'Refund', categoryId, fecha: '2024-03-16'
      });
      await agent.post('/api/transactions').send({
        tipo: 'income', monto: 2500, titulo: 'Salary', fecha: '2024-03-28'
      });

      const res = await agent.get('/api/summary?month=2024-03');
      expect(res.body.ingresos).toBe(2500);
      expect(res.body.gastos).toBe(50);
      expect(res.body.reembolsos).toBe(15);
      expect(res.body.gastosNetos).toBe(35);
      expect(res.body.ahorro).toBe(2465);
    });

    it('should show negative savings when expenses exceed income', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 3000, titulo: 'Big expense', categoryId, fecha: '2024-03-10'
      });
      await agent.post('/api/transactions').send({
        tipo: 'income', monto: 2500, titulo: 'Salary', fecha: '2024-03-28'
      });

      const res = await agent.get('/api/summary?month=2024-03');
      expect(res.body.ahorro).toBe(-500);
    });

    it('should break down by category', async () => {
      const cat2Res = await agent.post('/api/categories').send({ nombre: 'Transport', color: '#0F0' });
      const cat2Id = cat2Res.body.id;

      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 30, titulo: 'Food', categoryId, fecha: '2024-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 20, titulo: 'Bus', categoryId: cat2Id, fecha: '2024-03-16'
      });

      const res = await agent.get('/api/summary?month=2024-03');
      expect(res.body.porCategoria).toHaveLength(2);
      expect(res.body.porCategoria[0].neto).toBe(30);
      expect(res.body.porCategoria[1].neto).toBe(20);
    });

    it('should not count refunds as income', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'refund', monto: 100, titulo: 'Refund', categoryId, fecha: '2024-03-15'
      });

      const res = await agent.get('/api/summary?month=2024-03');
      expect(res.body.ingresos).toBe(0);
      expect(res.body.gastosNetos).toBe(-100);
      expect(res.body.ahorro).toBe(100);
    });
  });
});
