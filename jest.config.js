module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage/backend',
  collectCoverageFrom: [
    'server.js',
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  testMatch: ['**/tests/backend/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/backend/setup.js'],
  testTimeout: 10000,
  verbose: true
};