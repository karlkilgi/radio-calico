// Test setup for backend tests
const Database = require('better-sqlite3');
const { initializeSchema } = require('../../src/database/schema');

// Create a test database helper
global.createTestDb = () => {
  try {
    const db = new Database(':memory:');

    // Initialize schema using centralized module
    initializeSchema(db, 'sqlite');

    return db;
  } catch (error) {
    console.error('Failed to create test database:', error);
    throw error;
  }
};

// Clean up after tests
afterAll(() => {
  // Cleanup logic if needed
});