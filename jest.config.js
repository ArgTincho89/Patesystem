module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: [],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/services/cron.js',
    '!src/services/email.js',
    '!src/db/seed.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './src/routes/auth.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/routes/transactions.js': {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    './src/routes/summary.js': {
      branches: 85,
      functions: 80,
      lines: 90,
      statements: 90,
    },
    './src/routes/trends.js': {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/routes/goals.js': {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/routes/categories.js': {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/db/jsondb.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/middleware/**/*.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  // OneDrive compatibility: reparse points are treated as symlinks by Node
  haste: { enableSymlinks: true },
  watchman: false
};
