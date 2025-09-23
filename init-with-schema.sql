-- PostgreSQL initialization script for RadioCalico (with centralized schema)
-- This script uses the centralized schema definitions and adds performance optimizations

-- Note: The actual table creation is now handled by the centralized schema module
-- This file contains additional optimizations and permissions

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_hash ON songs(song_hash);
CREATE INDEX IF NOT EXISTS idx_ratings_song_id ON ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ratings_song_user ON ratings(song_id, user_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist_title ON songs(artist, title);

-- Grant permissions to the radiocalico user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO radiocalico;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO radiocalico;

-- Optional: Create views for common queries
CREATE OR REPLACE VIEW song_ratings_summary AS
SELECT
    s.id,
    s.title,
    s.artist,
    s.album,
    s.song_hash,
    COUNT(CASE WHEN r.rating = 1 THEN 1 END) as thumbs_up,
    COUNT(CASE WHEN r.rating = -1 THEN 1 END) as thumbs_down,
    COUNT(r.rating) as total_ratings,
    s.created_at
FROM songs s
LEFT JOIN ratings r ON s.id = r.song_id
GROUP BY s.id, s.title, s.artist, s.album, s.song_hash, s.created_at;

-- Grant access to the view
GRANT SELECT ON song_ratings_summary TO radiocalico;