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
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true
};
