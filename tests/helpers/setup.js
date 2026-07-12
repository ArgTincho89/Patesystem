const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DATA_DIR = path.join(__dirname, '..', '.test-data');

function setupTestDb() {
  if (fs.existsSync(TEMP_DATA_DIR)) {
    fs.rmSync(TEMP_DATA_DIR, { recursive: true });
  }
  fs.mkdirSync(TEMP_DATA_DIR, { recursive: true });

  const JsonDB = require('../../src/db/jsondb');
  return new JsonDB(TEMP_DATA_DIR);
}

function cleanupTestDb() {
  if (fs.existsSync(TEMP_DATA_DIR)) {
    fs.rmSync(TEMP_DATA_DIR, { recursive: true });
  }
}

function createTestUser(db, overrides = {}) {
  const userData = {
    email: `test-${uuidv4().slice(0, 8)}@example.com`,
    password: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    nombre: 'Test User',
    ...overrides
  };
  return db.createUser(userData);
}

function createTestCategory(db, userId, overrides = {}) {
  return db.create('categories', {
    userId,
    nombre: 'Test Category',
    color: '#FF0000',
    orden: 1,
    ...overrides
  }, userId);
}

function createTestTransaction(db, userId, overrides = {}) {
  return db.create('transactions', {
    userId,
    tipo: 'expense',
    monto: 25.50,
    titulo: 'Test Transaction',
    categoryId: null,
    fecha: '2024-03-15',
    ...overrides
  }, userId);
}

function createAuthenticatedAgent(app, userData) {
  const session = require('supertest-session');
  return session(app);
}

module.exports = {
  setupTestDb,
  cleanupTestDb,
  createTestUser,
  createTestCategory,
  createTestTransaction,
  TEMP_DATA_DIR
};
