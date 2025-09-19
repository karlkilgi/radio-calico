const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://d3d4yli4hf5bmh.cloudfront.net"],
      mediaSrc: ["'self'", "https://d3d4yli4hf5bmh.cloudfront.net", "blob:"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Database setup
let db;
let query, run, getAll, get;
let pool; // PostgreSQL connection pool

if (isProduction) {
  // PostgreSQL for production
  const { Pool } = require('pg');

  pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'radiocalico',
    user: process.env.DB_USER || 'radiocalico',
    password: process.env.DB_PASSWORD || 'radiocalico',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // PostgreSQL query wrapper
  query = async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  };

  run = async (text, params) => {
    const result = await pool.query(text, params);
    return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount };
  };

  getAll = async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  };

  get = async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows[0];
  };

  // Initialize PostgreSQL tables
  const initDb = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS songs (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          album TEXT,
          song_hash TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          song_id INTEGER NOT NULL REFERENCES songs(id),
          user_id TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(song_id, user_id)
        )
      `);

      console.log('PostgreSQL database initialized');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL database:', error);
      process.exit(1);
    }
  };

  initDb();

  // Cleanup on exit
  process.on('exit', () => {
    pool.end();
  });

  process.on('SIGINT', () => {
    pool.end();
    process.exit(0);
  });

} else {
  // SQLite for development
  const Database = require('better-sqlite3');
  db = new Database('./database.db');

  // SQLite wrappers to match async interface
  query = async (text, params = []) => {
    const stmt = text.includes('INSERT') && text.includes('RETURNING')
      ? text.replace(' RETURNING id', '')
      : text;

    if (text.includes('INSERT') || text.includes('UPDATE') || text.includes('DELETE')) {
      const result = db.prepare(stmt).run(...params);
      return [{ id: result.lastInsertRowid, ...result }];
    }
    return db.prepare(stmt).all(...params);
  };

  run = async (text, params = []) => {
    const stmt = text.replace(' RETURNING id', '');
    const result = db.prepare(stmt).run(...params);
    return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
  };

  getAll = async (text, params = []) => {
    return db.prepare(text).all(...params);
  };

  get = async (text, params = []) => {
    return db.prepare(text).get(...params);
  };

  // Initialize SQLite tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      song_hash TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs (id),
      UNIQUE(song_id, user_id)
    )
  `);

  // Cleanup on exit
  process.on('exit', () => {
    db.close();
  });

  process.on('SIGINT', () => {
    db.close();
    process.exit(0);
  });
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RadioCalico API',
    status: 'Server is running',
    database: isProduction ? 'PostgreSQL Connected' : 'SQLite Connected',
    radio_player: `http://localhost:${PORT}/radio.html`
  });
});

app.get('/radio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'radio.html'));
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await getAll('SELECT * FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (isProduction) {
      const result = await query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [name, email]
      );
      res.status(201).json(result[0]);
    } else {
      const result = await run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
      const newUser = await get('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
      res.status(201).json(newUser);
    }
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Rating endpoints
app.get('/api/song/:songHash/ratings', async (req, res) => {
  try {
    const { songHash } = req.params;

    const ratingsQuery = `
      SELECT
        SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN r.rating = -1 THEN 1 ELSE 0 END) as thumbs_down
      FROM songs s
      LEFT JOIN ratings r ON s.id = r.song_id
      WHERE s.song_hash = ${isProduction ? '$1' : '?'}
    `;

    const result = await get(ratingsQuery, [songHash]);
    res.json({
      thumbs_up: parseInt(result?.thumbs_up) || 0,
      thumbs_down: parseInt(result?.thumbs_down) || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/song/:songHash/rate', async (req, res) => {
  try {
    const { songHash } = req.params;
    const { rating, userId, title, artist, album } = req.body;

    if (!rating || !userId || !title || !artist) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
    }

    let songId;

    if (isProduction) {
      // PostgreSQL transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Try to insert song, or get existing
        let songResult = await client.query(
          'INSERT INTO songs (title, artist, album, song_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (song_hash) DO NOTHING RETURNING id',
          [title, artist, album, songHash]
        );

        if (songResult.rows.length === 0) {
          songResult = await client.query('SELECT id FROM songs WHERE song_hash = $1', [songHash]);
        }

        songId = songResult.rows[0].id;

        // Insert or update rating
        await client.query(
          `INSERT INTO ratings (song_id, user_id, rating)
           VALUES ($1, $2, $3)
           ON CONFLICT (song_id, user_id)
           DO UPDATE SET rating = EXCLUDED.rating`,
          [songId, userId, rating]
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite transaction
      const transaction = db.transaction((songHash, title, artist, album, userId, rating) => {
        let song;
        try {
          const insertSong = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
          const result = insertSong.run(title, artist, album, songHash);
          song = { id: result.lastInsertRowid };
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            song = db.prepare('SELECT id FROM songs WHERE song_hash = ?').get(songHash);
          } else {
            throw error;
          }
        }

        const insertRating = db.prepare(`
          INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)
          ON CONFLICT(song_id, user_id) DO UPDATE SET rating = excluded.rating
        `);
        insertRating.run(song.id, userId, rating);

        return song.id;
      });

      songId = transaction(songHash, title, artist, album, userId, rating);
    }

    // Get updated ratings
    const ratingsQuery = `
      SELECT
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
      FROM ratings WHERE song_id = ${isProduction ? '$1' : '?'}
    `;
    const updatedRatings = await get(ratingsQuery, [songId]);

    res.json({
      message: 'Rating submitted successfully',
      thumbs_up: parseInt(updatedRatings?.thumbs_up) || 0,
      thumbs_down: parseInt(updatedRatings?.thumbs_down) || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/song/:songHash/user-rating/:userId', async (req, res) => {
  try {
    const { songHash, userId } = req.params;

    const queryText = `
      SELECT r.rating
      FROM songs s
      JOIN ratings r ON s.id = r.song_id
      WHERE s.song_hash = ${isProduction ? '$1' : '?'} AND r.user_id = ${isProduction ? '$2' : '?'}
    `;

    const result = await get(queryText, [songHash, userId]);
    res.json({ rating: result ? result.rating : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IP endpoint for fingerprinting
app.get('/api/client-ip', (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.ip;

  res.json({ ip: clientIP });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Database: ${isProduction ? 'PostgreSQL' : 'SQLite'}`);
});