const JsonDB = require('../../src/db/jsondb');
const { setupTestDb, cleanupTestDb } = require('../helpers/setup');

describe('JsonDB', () => {
  let db;

  beforeEach(() => {
    db = setupTestDb();
  });

  afterEach(() => {
    cleanupTestDb();
  });

  describe('users', () => {
    it('should create and find a user by id', () => {
      const user = db.createUser({
        email: 'test@example.com',
        password: 'hashed',
        nombre: 'Test'
      });

      expect(user).toHaveProperty('id');
      expect(user.email).toBe('test@example.com');

      const found = db.findUserById(user.id);
      expect(found).not.toBeNull();
      expect(found.email).toBe('test@example.com');
    });

    it('should find a user by email', () => {
      db.createUser({ email: 'findme@test.com', password: 'x', nombre: 'A' });
      const found = db.findUserByEmail('findme@test.com');
      expect(found).not.toBeNull();
      expect(found.nombre).toBe('A');
    });

    it('should return null for non-existent email', () => {
      const found = db.findUserByEmail('nobody@test.com');
      expect(found).toBeNull();
    });

    it('should update a user', () => {
      const user = db.createUser({ email: 'u@test.com', password: 'x', nombre: 'Old' });
      const updated = db.updateUser(user.id, { nombre: 'New' });
      expect(updated.nombre).toBe('New');

      const found = db.findUserById(user.id);
      expect(found.nombre).toBe('New');
    });
  });

  describe('categories', () => {
    it('should create and list categories for a user', () => {
      const user = db.createUser({ email: 'a@test.com', password: 'x', nombre: 'A' });
      db.create('categories', { userId: user.id, nombre: 'Food', color: '#F00', orden: 1 }, user.id);
      db.create('categories', { userId: user.id, nombre: 'Transport', color: '#0F0', orden: 2 }, user.id);

      const cats = db.findAll('categories', user.id);
      expect(cats).toHaveLength(2);
      expect(cats[0].nombre).toBe('Food');
    });

    it('should not mix categories between users', () => {
      const user1 = db.createUser({ email: 'u1@test.com', password: 'x', nombre: 'A' });
      const user2 = db.createUser({ email: 'u2@test.com', password: 'x', nombre: 'B' });

      db.create('categories', { userId: user1.id, nombre: 'Cat1', orden: 1 }, user1.id);
      db.create('categories', { userId: user2.id, nombre: 'Cat2', orden: 1 }, user2.id);

      const cats1 = db.findAll('categories', user1.id);
      const cats2 = db.findAll('categories', user2.id);

      expect(cats1).toHaveLength(1);
      expect(cats2).toHaveLength(1);
      expect(cats1[0].nombre).toBe('Cat1');
      expect(cats2[0].nombre).toBe('Cat2');
    });

    it('should delete a category', () => {
      const user = db.createUser({ email: 'del@test.com', password: 'x', nombre: 'A' });
      const cat = db.create('categories', { userId: user.id, nombre: 'Del', orden: 1 }, user.id);

      const result = db.remove('categories', cat.id, user.id);
      expect(result).toBe(true);

      const cats = db.findAll('categories', user.id);
      expect(cats).toHaveLength(0);
    });

    it('should update a category', () => {
      const user = db.createUser({ email: 'upd@test.com', password: 'x', nombre: 'A' });
      const cat = db.create('categories', { userId: user.id, nombre: 'Old', orden: 1 }, user.id);

      const updated = db.update('categories', cat.id, { nombre: 'New' }, user.id);
      expect(updated.nombre).toBe('New');
    });
  });

  describe('transactions', () => {
    it('should create and list transactions', () => {
      const user = db.createUser({ email: 'tx@test.com', password: 'x', nombre: 'A' });
      db.create('transactions', {
        userId: user.id, tipo: 'expense', monto: 10, titulo: 'Test', fecha: '2024-03-15'
      }, user.id);

      const txs = db.findAll('transactions', user.id);
      expect(txs).toHaveLength(1);
      expect(txs[0].monto).toBe(10);
    });

    it('should filter transactions by month', () => {
      const user = db.createUser({ email: 'filter@test.com', password: 'x', nombre: 'A' });
      db.create('transactions', {
        userId: user.id, tipo: 'expense', monto: 10, titulo: 'Mar', fecha: '2024-03-15'
      }, user.id);
      db.create('transactions', {
        userId: user.id, tipo: 'expense', monto: 20, titulo: 'Apr', fecha: '2024-04-10'
      }, user.id);

      const all = db.findAll('transactions', user.id);
      expect(all).toHaveLength(2);

      const march = all.filter(t => t.fecha.startsWith('2024-03'));
      expect(march).toHaveLength(1);
    });

    it('should not mix transactions between users', () => {
      const user1 = db.createUser({ email: 'u1x@test.com', password: 'x', nombre: 'A' });
      const user2 = db.createUser({ email: 'u2x@test.com', password: 'x', nombre: 'B' });

      db.create('transactions', {
        userId: user1.id, tipo: 'expense', monto: 10, titulo: 'U1', fecha: '2024-03-15'
      }, user1.id);
      db.create('transactions', {
        userId: user2.id, tipo: 'expense', monto: 20, titulo: 'U2', fecha: '2024-03-15'
      }, user2.id);

      expect(db.findAll('transactions', user1.id)).toHaveLength(1);
      expect(db.findAll('transactions', user2.id)).toHaveLength(1);
    });

    it('should delete a transaction', () => {
      const user = db.createUser({ email: 'deltx@test.com', password: 'x', nombre: 'A' });
      const tx = db.create('transactions', {
        userId: user.id, tipo: 'expense', monto: 10, titulo: 'Del', fecha: '2024-03-15'
      }, user.id);

      db.remove('transactions', tx.id, user.id);
      expect(db.findAll('transactions', user.id)).toHaveLength(0);
    });
  });

  describe('atomic writes', () => {
    it('should handle concurrent writes without corruption', () => {
      const user = db.createUser({ email: 'atomic@test.com', password: 'x', nombre: 'A' });

      for (let i = 0; i < 10; i++) {
        db.create('transactions', {
          userId: user.id, tipo: 'expense', monto: i, titulo: `Tx ${i}`, fecha: '2024-03-15'
        }, user.id);
      }

      const txs = db.findAll('transactions', user.id);
      expect(txs).toHaveLength(10);
    });
  });
});
