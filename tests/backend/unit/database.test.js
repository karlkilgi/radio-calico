const Database = require('better-sqlite3');

describe('Database Operations', () => {
  let db;

  beforeEach(() => {
    db = global.createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  describe('Songs Table', () => {
    test('should create song record', () => {
      const song = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        song_hash: 'hash123'
      };

      const stmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
      const result = stmt.run(song.title, song.artist, song.album, song.song_hash);

      expect(result.lastInsertRowid).toBeDefined();
      expect(result.changes).toBe(1);

      // Verify the song was inserted
      const inserted = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);
      expect(inserted.title).toBe(song.title);
      expect(inserted.artist).toBe(song.artist);
      expect(inserted.album).toBe(song.album);
      expect(inserted.song_hash).toBe(song.song_hash);
    });

    test('should handle duplicate song_hash with unique constraint', () => {
      const song = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        song_hash: 'hash123'
      };

      const stmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');

      // First insert should succeed
      stmt.run(song.title, song.artist, song.album, song.song_hash);

      // Second insert with same song_hash should fail
      expect(() => {
        stmt.run('Different Song', 'Different Artist', 'Different Album', song.song_hash);
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('should retrieve song by hash', () => {
      const song = {
        title: 'Find Me',
        artist: 'Search Artist',
        album: 'Search Album',
        song_hash: 'unique_hash'
      };

      const insertStmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
      insertStmt.run(song.title, song.artist, song.album, song.song_hash);

      const selectStmt = db.prepare('SELECT * FROM songs WHERE song_hash = ?');
      const found = selectStmt.get(song.song_hash);

      expect(found).toBeDefined();
      expect(found.title).toBe(song.title);
      expect(found.artist).toBe(song.artist);
    });
  });

  describe('Ratings Table', () => {
    let songId;

    beforeEach(() => {
      // Insert a test song
      const stmt = db.prepare('INSERT INTO songs (title, artist, album, song_hash) VALUES (?, ?, ?, ?)');
      const result = stmt.run('Test Song', 'Test Artist', 'Test Album', 'test_hash');
      songId = result.lastInsertRowid;
    });

    test('should create rating record', () => {
      const rating = {
        song_id: songId,
        user_id: 'user123',
        rating: 1
      };

      const stmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      const result = stmt.run(rating.song_id, rating.user_id, rating.rating);

      expect(result.lastInsertRowid).toBeDefined();
      expect(result.changes).toBe(1);

      // Verify the rating was inserted
      const inserted = db.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);
      expect(inserted.song_id).toBe(rating.song_id);
      expect(inserted.user_id).toBe(rating.user_id);
      expect(inserted.rating).toBe(rating.rating);
    });

    test('should enforce rating values constraint (-1 or 1)', () => {
      const stmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      // Valid ratings
      expect(() => stmt.run(songId, 'user1', 1)).not.toThrow();
      expect(() => stmt.run(songId, 'user2', -1)).not.toThrow();

      // Invalid rating
      expect(() => stmt.run(songId, 'user3', 0)).toThrow(/CHECK constraint failed/);
      expect(() => stmt.run(songId, 'user4', 2)).toThrow(/CHECK constraint failed/);
    });

    test('should enforce unique constraint on song_id and user_id', () => {
      const stmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      // First rating should succeed
      stmt.run(songId, 'user123', 1);

      // Second rating from same user for same song should fail
      expect(() => {
        stmt.run(songId, 'user123', -1);
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('should update existing rating with ON CONFLICT', () => {
      const insertStmt = db.prepare(`
        INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)
        ON CONFLICT(song_id, user_id) DO UPDATE SET rating = excluded.rating
      `);

      // Initial rating
      insertStmt.run(songId, 'user123', 1);

      // Check initial rating
      let rating = db.prepare('SELECT rating FROM ratings WHERE song_id = ? AND user_id = ?').get(songId, 'user123');
      expect(rating.rating).toBe(1);

      // Update rating
      insertStmt.run(songId, 'user123', -1);

      // Check updated rating
      rating = db.prepare('SELECT rating FROM ratings WHERE song_id = ? AND user_id = ?').get(songId, 'user123');
      expect(rating.rating).toBe(-1);

      // Verify only one record exists
      const count = db.prepare('SELECT COUNT(*) as count FROM ratings WHERE song_id = ? AND user_id = ?').get(songId, 'user123');
      expect(count.count).toBe(1);
    });

    test('should aggregate ratings correctly', () => {
      // Insert multiple ratings
      const stmt = db.prepare('INSERT INTO ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run(songId, 'user1', 1);
      stmt.run(songId, 'user2', 1);
      stmt.run(songId, 'user3', -1);
      stmt.run(songId, 'user4', 1);
      stmt.run(songId, 'user5', -1);

      const aggregateQuery = `
        SELECT
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
          SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down
        FROM ratings WHERE song_id = ?
      `;

      const result = db.prepare(aggregateQuery).get(songId);
      expect(result.thumbs_up).toBe(3);
      expect(result.thumbs_down).toBe(2);
    });
  });

  describe('Users Table', () => {
    test('should create user record', () => {
      const user = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const result = stmt.run(user.name, user.email);

      expect(result.lastInsertRowid).toBeDefined();
      expect(result.changes).toBe(1);

      // Verify the user was inserted
      const inserted = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      expect(inserted.name).toBe(user.name);
      expect(inserted.email).toBe(user.email);
      expect(inserted.created_at).toBeDefined();
    });

    test('should enforce unique email constraint', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

      // First user should succeed
      stmt.run('User 1', 'duplicate@example.com');

      // Second user with same email should fail
      expect(() => {
        stmt.run('User 2', 'duplicate@example.com');
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('should retrieve all users ordered by creation date', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

      // Add small delays to ensure different timestamps
      stmt.run('User A', 'a@example.com');

      // Use explicit timestamps to ensure ordering
      const now = new Date().toISOString();
      const later1 = new Date(Date.now() + 1000).toISOString();
      const later2 = new Date(Date.now() + 2000).toISOString();

      db.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(now, 'a@example.com');

      stmt.run('User B', 'b@example.com');
      db.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(later1, 'b@example.com');

      stmt.run('User C', 'c@example.com');
      db.prepare('UPDATE users SET created_at = ? WHERE email = ?').run(later2, 'c@example.com');

      const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();

      expect(users).toHaveLength(3);
      expect(users[0].email).toBe('c@example.com');
      expect(users[1].email).toBe('b@example.com');
      expect(users[2].email).toBe('a@example.com');
    });
  });
});