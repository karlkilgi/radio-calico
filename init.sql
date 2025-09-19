-- PostgreSQL initialization script for RadioCalico
-- This script runs when the PostgreSQL container is first created

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    song_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_hash ON songs(song_hash);
CREATE INDEX IF NOT EXISTS idx_ratings_song_id ON ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Grant permissions to the radiocalico user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO radiocalico;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO radiocalico;