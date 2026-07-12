const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb, createTestUser, createTestCategory } = require('../helpers/setup');

describe('Transactions Routes', () => {
  let db;
  let agent;
  let userId;
  let categoryId;

  beforeEach(async () => {
    db = setupTestDb();
    app.locals.db = db;

    agent = request.agent(app);
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'tx@test.com', password: '123456', nombre: 'Tx User' });
    userId = res.body.id;

    const catRes = await agent.post('/api/categories').send({ nombre: 'Food', color: '#F00' });
    categoryId = catRes.body.id;
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('POST /api/transactions', () => {
    it('should create an expense', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 25.50, titulo: 'Supermercado', categoryId, fecha: '2024-03-15'
      });
      expect(res.status).toBe(201);
      expect(res.body.tipo).toBe('expense');
      expect(res.body.monto).toBe(25.5);
    });

    it('should create an income without category', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'income', monto: 2500, titulo: 'Salario', fecha: '2024-03-28'
      });
      expect(res.status).toBe(201);
      expect(res.body.tipo).toBe('income');
      expect(res.body.categoryId).toBeNull();
    });

    it('should create a refund with category', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'refund', monto: 15, titulo: 'Devolución', categoryId, fecha: '2024-03-16'
      });
      expect(res.status).toBe(201);
      expect(res.body.tipo).toBe('refund');
    });

    it('should reject expense without category', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'X'
      });
      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'invalid', monto: 10, titulo: 'X'
      });
      expect(res.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: -10, titulo: 'X', categoryId
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-existent category', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'X', categoryId: 'nonexistent'
      });
      expect(res.status).toBe(400);
    });

    it('should round amount to 2 decimals', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10.555, titulo: 'Round', categoryId, fecha: '2024-03-15'
      });
      expect(res.body.monto).toBe(10.56);
    });
  });

  describe('GET /api/transactions', () => {
    it('should list transactions for a month', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'Mar', categoryId, fecha: '2024-03-15'
      });
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 20, titulo: 'Apr', categoryId, fecha: '2024-04-10'
      });

      const res = await agent.get('/api/transactions?month=2024-03');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].titulo).toBe('Mar');
    });

    it('should require month parameter', async () => {
      const res = await agent.get('/api/transactions');
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'Old', categoryId, fecha: '2024-03-15'
      });
      const id = createRes.body.id;

      const res = await agent.put(`/api/transactions/${id}`).send({ titulo: 'New', monto: 20 });
      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe('New');
      expect(res.body.monto).toBe(20);
    });

    it('should return 404 for non-existent', async () => {
      const res = await agent.put('/api/transactions/nonexistent').send({ titulo: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'Del', categoryId, fecha: '2024-03-15'
      });

      const res = await agent.delete(`/api/transactions/${createRes.body.id}`);
      expect(res.status).toBe(200);

      const listRes = await agent.get('/api/transactions?month=2024-03');
      expect(listRes.body).toHaveLength(0);
    });
  });
});
