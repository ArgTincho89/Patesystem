const request = require('supertest');
const app = require('../../src/app');
const { setupTestDb, cleanupTestDb, createTestUser } = require('../helpers/setup');

describe('Auth Routes', () => {
  let db;

  beforeEach(() => {
    db = setupTestDb();
    app.locals.db = db;
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: '123456', nombre: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('new@test.com');
      expect(res.body.nombre).toBe('New User');
    });

    it('should reject duplicate email', async () => {
      createTestUser(db, { email: 'dup@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', password: '123456', nombre: 'Dup' });

      expect(res.status).toBe(409);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'x@test.com' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'x@test.com', password: '123', nombre: 'X' });

      expect(res.status).toBe(400);
    });

    it('should create default categories on register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'seed@test.com', password: '123456', nombre: 'Seed' });

      expect(res.status).toBe(201);

      const cats = db.findAll('categories', res.body.id);
      expect(cats.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash('123456', 12);
      createTestUser(db, { email: 'login@test.com', password: hashedPw });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('login@test.com');
    });

    it('should reject invalid password', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash('123456', 12);
      createTestUser(db, { email: 'login2@test.com', password: hashedPw });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login2@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexist@test.com', password: '123456' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when logged in', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/register')
        .send({ email: 'me@test.com', password: '123456', nombre: 'Me' });

      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('me@test.com');
    });

    it('should return 401 when not logged in', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const agent = request.agent(app);

      await agent
        .post('/api/auth/register')
        .send({ email: 'out@test.com', password: '123456', nombre: 'Out' });

      const res = await agent.post('/api/auth/logout');
      expect(res.status).toBe(200);

      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });
});
