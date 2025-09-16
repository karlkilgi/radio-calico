const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;

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

const db = new Database('./database.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create tables for song ratings
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

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RadioCalico API',
    status: 'Server is running',
    database: 'Connected',
    radio_player: 'http://localhost:3001/radio.html'
  });
});

app.get('/radio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'radio.html'));
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run(name, email);
    
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Rating endpoints
app.get('/api/song/:songHash/ratings', (req, res) => {
  try {
    const { songHash } = req.params;
    
    const ratingsQuery = `
      SELECT 
        SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN r.rating = -1 THEN 1 ELSE 0 END) as thumbs_down
      FROM songs s
      LEFT JOIN ratings r ON s.id = r.song_id
      WHERE s.song_hash = ?
    `;
    
    const result = db.prepare(ratingsQuery).get(songHash);
    res.json({
      thumbs_up: result.thumbs_up || 0,
      thumbs_down: result.thumbs_down || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/song/:songHash/rate', (req, res) => {
  try {
    const { songHash } = req.params;
    const { rating, userId, title, artist, album } = req.body;
    
    if (!rating || !userId || !title || !artist) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
    }
    
    // Start a transaction
    const transaction = db.transaction((songHash, title, artist, album, userId, rating) => {
      // Insert or get song
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
      
      // Insert or update rating
      const insertRating = db.prepare(`
        INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)
        ON CONFLICT(song_id, user_id) DO UPDATE SET rating = excluded.rating
      `);
      insertRating.run(song.id, userId, rating);
      
      return song.id;
    });
    
    const songId = transaction(songHash, title, artist, album, userId, rating);
    
    // Get updated ratings
    const ratingsQuery = `
      SELECT 
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
      FROM ratings WHERE song_id = ?
    `;
    const updatedRatings = db.prepare(ratingsQuery).get(songId);
    
    res.json({
      message: 'Rating submitted successfully',
      thumbs_up: updatedRatings.thumbs_up || 0,
      thumbs_down: updatedRatings.thumbs_down || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/song/:songHash/user-rating/:userId', (req, res) => {
  try {
    const { songHash, userId } = req.params;
    
    const query = `
      SELECT r.rating
      FROM songs s
      JOIN ratings r ON s.id = r.song_id
      WHERE s.song_hash = ? AND r.user_id = ?
    `;
    
    const result = db.prepare(query).get(songHash, userId);
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
  console.log(`Database initialized: ${path.resolve('./database.db')}`);
});

process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});