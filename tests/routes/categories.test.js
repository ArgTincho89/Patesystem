const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb, createTestUser, createTestCategory } = require('../helpers/setup');

describe('Categories Routes', () => {
  let db;
  let agent;
  let userId;

  beforeEach(async () => {
    db = setupTestDb();
    app.locals.db = db;

    agent = request.agent(app);
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'cat@test.com', password: '123456', nombre: 'Cat User' });
    userId = res.body.id;
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('GET /api/categories', () => {
    it('should return seeded default categories', async () => {
      const res = await agent.get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return categories after creation', async () => {
      const before = await agent.get('/api/categories');
      const beforeCount = before.body.length;
      await agent.post('/api/categories').send({ nombre: 'Food', color: '#F00' });
      const res = await agent.get('/api/categories');
      expect(res.body).toHaveLength(beforeCount + 1);
      const food = res.body.find(c => c.nombre === 'Food');
      expect(food).toBeDefined();
    });
  });

  describe('POST /api/categories', () => {
    it('should create a category', async () => {
      const res = await agent.post('/api/categories').send({ nombre: 'Transport', color: '#0F0' });
      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe('Transport');
      expect(res.body).toHaveProperty('id');
    });

    it('should reject empty name', async () => {
      const res = await agent.post('/api/categories').send({ nombre: '' });
      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app).post('/api/categories').send({ nombre: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category', async () => {
      const createRes = await agent.post('/api/categories').send({ nombre: 'Old' });
      const id = createRes.body.id;

      const res = await agent.put(`/api/categories/${id}`).send({ nombre: 'New' });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('New');
    });

    it('should return 404 for non-existent category', async () => {
      const res = await agent.put('/api/categories/nonexistent').send({ nombre: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category without transactions', async () => {
      const createRes = await agent.post('/api/categories').send({ nombre: 'Del' });
      const id = createRes.body.id;

      const res = await agent.delete(`/api/categories/${id}`);
      expect(res.status).toBe(200);

      const listRes = await agent.get('/api/categories');
      const deleted = listRes.body.find(c => c.id === id);
      expect(deleted).toBeUndefined();
    });

    it('should reject deletion if category has transactions', async () => {
      const catRes = await agent.post('/api/categories').send({ nombre: 'Used' });
      const catId = catRes.body.id;

      await agent.post('/api/transactions').send({
        tipo: 'expense', monto: 10, titulo: 'Test', categoryId: catId, fecha: '2024-03-15'
      });

      const res = await agent.delete(`/api/categories/${catId}`);
      expect(res.status).toBe(409);
    });
  });
});
