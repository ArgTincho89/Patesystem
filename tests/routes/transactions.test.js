const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb, createTestUser, createTestCategory } = require('../helpers/setup');

describe('Transactions Routes', () => {
  let db;
  let agent;
  let userId;
  let categoryId;

  beforeAll(async () => {
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

  afterAll(() => {
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

    it('should reject refund without category', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'refund', monto: 10, titulo: 'X'
      });
      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'invalid', monto: 10, titulo: 'X'
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing type', async () => {
      const res = await agent.post('/api/transactions').send({
        monto: 10, titulo: 'X'
      });
      expect(res.status).toBe(400);
    });

    it('should reject negative amount', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: -10, titulo: 'X', categoryId
      });
      expect(res.status).toBe(400);
    });

    it('should reject zero amount', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 0, titulo: 'X', categoryId
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-numeric amount', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 'abc', titulo: 'X', categoryId
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing title', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, categoryId
      });
      expect(res.status).toBe(400);
    });

    it('should reject empty title', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: '  ', categoryId
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

    it('should default to today when no date provided', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 5, titulo: 'Today', categoryId
      });
      expect(res.status).toBe(201);
      expect(res.body.fecha).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should create a recurring monthly transaction', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 100, titulo: 'Alquiler', categoryId,
        fecha: '2024-01-15', recurrente: true, frecuencia: 'monthly'
      });
      expect(res.status).toBe(201);
      expect(res.body.recurrente).toBe(true);
      expect(res.body.frecuencia).toBe('monthly');
    });

    it('should create a recurring transaction with fechaFin', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 50, titulo: 'Netflix', categoryId,
        fecha: '2024-01-10', recurrente: true, frecuencia: 'monthly', fechaFin: '2024-06-30'
      });
      expect(res.status).toBe(201);
      expect(res.body.fechaFin).toBe('2024-06-30');
    });

    it('should reject invalid frecuencia', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 50, titulo: 'X', categoryId,
        recurrente: true, frecuencia: 'weekly'
      });
      expect(res.status).toBe(400);
    });

    it('should default frequency to monthly when recurrente is true', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 50, titulo: 'Default Freq', categoryId,
        fecha: '2024-01-10', recurrente: true
      });
      expect(res.status).toBe(201);
      expect(res.body.frecuencia).toBe('monthly');
    });

    it('should set null freq when not recurrente', async () => {
      const res = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'NotRecur', categoryId,
        recurrente: false, frecuencia: 'monthly'
      });
      expect(res.status).toBe(201);
      expect(res.body.frecuencia).toBeNull();
      expect(res.body.fechaFin).toBeNull();
    });
  });

  describe('GET /api/transactions', () => {
    it('should list transactions for a month', async () => {
      const res = await agent.get('/api/transactions?month=2024-03');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should require month parameter', async () => {
      const res = await agent.get('/api/transactions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should include recurring instances for matching months', async () => {
      const res = await agent.get('/api/transactions?month=2024-02');
      expect(res.status).toBe(200);
      const recurring = res.body.filter(t => t.isRecurringInstance);
      expect(recurring.length).toBeGreaterThan(0);
    });

    it('should not include recurring instances before start date', async () => {
      const res = await agent.get('/api/transactions?month=2023-12');
      expect(res.status).toBe(200);
      const recurring = res.body.filter(t => t.isRecurringInstance);
      expect(recurring.length).toBe(0);
    });

    it('should not include recurring instances after fechaFin', async () => {
      const res = await agent.get('/api/transactions?month=2024-07');
      expect(res.status).toBe(200);
      const netflix = res.body.filter(t => t.titulo === 'Netflix');
      expect(netflix.length).toBe(0);
    });

    it('should include semiannual recurring instances', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 200, titulo: 'SeguroSem', categoryId,
        fecha: '2024-01-15', recurrente: true, frecuencia: 'semiannual'
      });
      const res = await agent.get('/api/transactions?month=2024-07');
      expect(res.status).toBe(200);
      const semi = res.body.filter(t => t.titulo === 'SeguroSem' && t.isRecurringInstance);
      expect(semi.length).toBe(1);
    });

    it('should include annual recurring instances', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 500, titulo: 'ImpuestoAnual', categoryId,
        fecha: '2024-03-15', recurrente: true, frecuencia: 'annual'
      });
      const res = await agent.get('/api/transactions?month=2025-03');
      expect(res.status).toBe(200);
      const annual = res.body.filter(t => t.titulo === 'ImpuestoAnual' && t.isRecurringInstance);
      expect(annual.length).toBe(1);
    });

    it('should not duplicate recurring instance if also a real transaction', async () => {
      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'DupeCheck', categoryId,
        fecha: '2024-03-10', recurrente: true, frecuencia: 'monthly'
      });
      const res = await agent.get('/api/transactions?month=2024-03');
      const dupeChecks = res.body.filter(t => t.titulo === 'DupeCheck');
      expect(dupeChecks.length).toBe(1);
    });

    it('should sort by fecha descending then createdAt', async () => {
      const res = await agent.get('/api/transactions?month=2024-03');
      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i - 1].fecha.localeCompare(res.body[i].fecha)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('GET /api/transactions/recurring-total', () => {
    it('should require month parameter', async () => {
      const res = await agent.get('/api/transactions/recurring-total');
      expect(res.status).toBe(400);
    });

    it('should return recurring totals for a month', async () => {
      const res = await agent.get('/api/transactions/recurring-total?month=2024-02');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('items');
      expect(res.body.month).toBe('2024-02');
      expect(typeof res.body.total).toBe('number');
    });

    it('should sum only expense recurring transactions', async () => {
      const res = await agent.get('/api/transactions/recurring-total?month=2024-02');
      expect(res.body.total).toBeGreaterThan(0);
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

    it('should reject invalid tipo on update', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'BadType', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({ tipo: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should reject negative monto on update', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'NegUpd', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({ monto: -5 });
      expect(res.status).toBe(400);
    });

    it('should reject expense without category on update', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'CatUpd', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({ categoryId: null });
      expect(res.status).toBe(400);
    });

    it('should reject non-existent category on update', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'CatFake', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({ categoryId: 'fake' });
      expect(res.status).toBe(400);
    });

    it('should allow changing tipo to income and removing category', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'ToIncome', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({
        tipo: 'income', categoryId: null
      });
      expect(res.status).toBe(200);
      expect(res.body.tipo).toBe('income');
      expect(res.body.categoryId).toBeNull();
    });

    it('should round monto on update', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'RoundUpd', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({ monto: 10.555 });
      expect(res.body.monto).toBe(10.56);
    });

    it('should update recurrente fields', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'RecUpd', categoryId, fecha: '2024-03-15'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({
        recurrente: true, frecuencia: 'annual', fechaFin: '2025-12-31'
      });
      expect(res.status).toBe(200);
      expect(res.body.recurrente).toBe(true);
      expect(res.body.frecuencia).toBe('annual');
      expect(res.body.fechaFin).toBe('2025-12-31');
    });

    it('should clear freq when setting recurrente false', async () => {
      const createRes = await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'ClearRec', categoryId,
        fecha: '2024-03-15', recurrente: true, frecuencia: 'monthly'
      });
      const res = await agent.put(`/api/transactions/${createRes.body.id}`).send({
        recurrente: false
      });
      expect(res.status).toBe(200);
      expect(res.body.frecuencia).toBeNull();
      expect(res.body.fechaFin).toBeNull();
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
      const found = listRes.body.find(t => t.id === createRes.body.id);
      expect(found).toBeUndefined();
    });

    it('should return 404 for non-existent', async () => {
      const res = await agent.delete('/api/transactions/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
