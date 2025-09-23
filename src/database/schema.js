/**
 * Centralized database schema definitions for RadioCalico
 * Supports both SQLite (development) and PostgreSQL (production)
 */

const SCHEMAS = {
  sqlite: {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    songs: `
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        song_hash TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ratings: `
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (song_id) REFERENCES songs (id),
        UNIQUE(song_id, user_id)
      )
    `
  },

  postgres: {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `,
    songs: `
      CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        album VARCHAR(255),
        song_hash VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ratings: `
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        song_id INTEGER NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (song_id) REFERENCES songs (id),
        UNIQUE(song_id, user_id)
      )
    `
  }
};

/**
 * Initialize database with the appropriate schema based on database type
 * @param {Object} db - Database connection object
 * @param {string} dbType - Database type ('sqlite' or 'postgres')
 * @returns {Promise<void>}
 */
function initializeSchema(db, dbType = 'sqlite') {
  const schemas = SCHEMAS[dbType];

  if (!schemas) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  try {
    // Initialize tables in order (users, songs, ratings due to foreign key dependencies)
    if (dbType === 'sqlite') {
      db.exec(schemas.users);
      db.exec(schemas.songs);
      db.exec(schemas.ratings);
    } else if (dbType === 'postgres') {
      // For PostgreSQL, execute asynchronously
      return Promise.all([
        db.query(schemas.users),
        db.query(schemas.songs),
        db.query(schemas.ratings)
      ]);
    }
  } catch (error) {
    throw new Error(`Failed to initialize ${dbType} schema: ${error.message}`);
  }
}

/**
 * Get schema for a specific table and database type
 * @param {string} tableName - Name of the table
 * @param {string} dbType - Database type ('sqlite' or 'postgres')
 * @returns {string} SQL schema definition
 */
function getTableSchema(tableName, dbType = 'sqlite') {
  const schemas = SCHEMAS[dbType];

  if (!schemas || !schemas[tableName]) {
    throw new Error(`Schema not found for table '${tableName}' in database type '${dbType}'`);
  }

  return schemas[tableName];
}

/**
 * Get all table names for a database type
 * @param {string} dbType - Database type ('sqlite' or 'postgres')
 * @returns {string[]} Array of table names
 */
function getTableNames(dbType = 'sqlite') {
  const schemas = SCHEMAS[dbType];

  if (!schemas) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  return Object.keys(schemas);
}

module.exports = {
  SCHEMAS,
  initializeSchema,
  getTableSchema,
  getTableNames
};