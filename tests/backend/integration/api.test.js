const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

describe('API Endpoints', () => {
  let app;
  let db;

  beforeEach(() => {
    // Create test database
    try {
      db = global.createTestDb();
      if (!db) {
        throw new Error('Failed to create test database');
      }
    } catch (error) {
      console.error('Error creating test database:', error);
      throw error;
    }

    // Create Express app
    app = express();
    app.use(express.json());

    // Mount API routes (simplified version for testing)
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

        if (rating !== 1 && rating !== -1) {
          return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
        }

        if (!userId || !title || !artist) {
          return res.status(400).json({ error: 'Missing required fields' });
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

    app.get('/api/client-ip', (req, res) => {
      const clientIP = req.headers['x-forwarded-for'] ||
                       req.headers['x-real-ip'] ||
                       req.ip ||
                       '127.0.0.1';

      res.json({ ip: clientIP });
    });
  });

  afterEach(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  });

  describe('GET /api/users', () => {
    test('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return all users', async () => {
      // Insert test users with explicit timestamps
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      stmt.run('User 1', 'user1@example.com');
      stmt.run('User 2', 'user2@example.com');

      // Update timestamps to ensure ordering
      const now = new Date().toISOString();
      const later = new Date(Date.now() + 1000).toISOString();
      db.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(now, 'user1@example.com');
      db.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(later, 'user2@example.com');

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].email).toBe('user2@example.com');
      expect(response.body[1].email).toBe('user1@example.com');
    });
  });

  describe('POST /api/users', () => {
    test('should create new user', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);

      expect(response.body.name).toBe(newUser.name);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.id).toBeDefined();
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Test User' })
        .expect(400);

      expect(response.body.error).toBe('Name and email are required');
    });

    test('should return 400 for duplicate email', async () => {
      const user = { name: 'User 1', email: 'duplicate@example.com' };

      // First request should succeed
      await request(app)
        .post('/api/users')
        .send(user)
        .expect(201);

      // Second request with same email should fail
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'User 2', email: 'duplicate@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('GET /api/song/:songHash/ratings', () => {
    test('should return zero counts for non-existent song', async () => {
      const response = await request(app)
        .get('/api/song/nonexistent/ratings')
        .expect(200);

      expect(response.body).toEqual({
        thumbs_up: 0,
        thumbs_down: 0
      });
    });

    test('should return correct rating counts', async () => {
      // Insert a song
      const songStmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
      const songResult = songStmt.run('Test Song', 'Test Artist', 'Test Album', 'test123');
      const songId = songResult.lastInsertRowid;

      // Insert ratings
      const ratingStmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      ratingStmt.run(songId, 'user1', 1);
      ratingStmt.run(songId, 'user2', 1);
      ratingStmt.run(songId, 'user3', -1);

      const response = await request(app)
        .get('/api/song/test123/ratings')
        .expect(200);

      expect(response.body).toEqual({
        thumbs_up: 2,
        thumbs_down: 1
      });
    });
  });

  describe('POST /api/song/:songHash/rate', () => {
    test('should create new rating', async () => {
      const rating = {
        rating: 1,
        userId: 'user123',
        title: 'Song Title',
        artist: 'Artist Name',
        album: 'Album'
      };

      const response = await request(app)
        .post('/api/song/hash123/rate')
        .send(rating)
        .expect(200);

      expect(response.body.message).toBe('Rating submitted successfully');
      expect(response.body.thumbs_up).toBe(1);
      expect(response.body.thumbs_down).toBe(0);
    });

    test('should update existing rating', async () => {
      const rating = {
        rating: 1,
        userId: 'user123',
        title: 'Song Title',
        artist: 'Artist Name',
        album: 'Album'
      };

      // First rating
      await request(app)
        .post('/api/song/hash456/rate')
        .send(rating)
        .expect(200);

      // Change rating
      rating.rating = -1;
      const response = await request(app)
        .post('/api/song/hash456/rate')
        .send(rating)
        .expect(200);

      expect(response.body.thumbs_up).toBe(0);
      expect(response.body.thumbs_down).toBe(1);
    });

    test('should reject invalid rating values', async () => {
      const rating = {
        rating: 0, // Invalid rating value
        userId: 'user123',
        title: 'Song Title',
        artist: 'Artist Name',
        album: 'Album'
      };

      const response = await request(app)
        .post('/api/song/hash789/rate')
        .send(rating)
        .expect(400);

      expect(response.body.error).toBe('Rating must be 1 (thumbs up) or -1 (thumbs down)');
    });

    test('should reject invalid rating values (2)', async () => {
      const rating = {
        rating: 2, // Invalid rating value
        userId: 'user123',
        title: 'Song Title',
        artist: 'Artist Name',
        album: 'Album'
      };

      const response = await request(app)
        .post('/api/song/hash790/rate')
        .send(rating)
        .expect(400);

      expect(response.body.error).toBe('Rating must be 1 (thumbs up) or -1 (thumbs down)');
    });

    test('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/song/hash000/rate')
        .send({ rating: 1, userId: 'user123' })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('GET /api/song/:songHash/user-rating/:userId', () => {
    test('should return null for non-existent rating', async () => {
      const response = await request(app)
        .get('/api/song/nonexistent/user-rating/user123')
        .expect(200);

      expect(response.body).toEqual({ rating: null });
    });

    test('should return user rating', async () => {
      // Insert a song
      const songStmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
      const songResult = songStmt.run('Test Song', 'Test Artist', 'Test Album', 'usertest');
      const songId = songResult.lastInsertRowid;

      // Insert rating
      const ratingStmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      ratingStmt.run(songId, 'testuser', -1);

      const response = await request(app)
        .get('/api/song/usertest/user-rating/testuser')
        .expect(200);

      expect(response.body).toEqual({ rating: -1 });
    });
  });

  describe('GET /api/client-ip', () => {
    test('should return client IP address', async () => {
      const response = await request(app)
        .get('/api/client-ip')
        .expect(200);

      expect(response.body).toHaveProperty('ip');
      expect(typeof response.body.ip).toBe('string');
    });

    test('should use x-forwarded-for header if present', async () => {
      const response = await request(app)
        .get('/api/client-ip')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      expect(response.body.ip).toBe('192.168.1.1');
    });
  });
});