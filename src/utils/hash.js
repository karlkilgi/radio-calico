/**
 * Hash utility functions for RadioCalico
 * Provides consistent hashing across client and server
 */

/**
 * Generate a hash from a string using a simple hash algorithm
 * @param {string} str - The string to hash
 * @returns {string} Hash string in base36 format
 */
function hashString(str) {
  if (typeof str !== 'string') {
    throw new Error('hashString expects a string input');
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a song hash from track metadata
 * @param {Object} track - Track metadata object
 * @param {string} track.artist - Artist name
 * @param {string} track.title - Song title
 * @param {string} [track.album] - Album name (optional)
 * @returns {string} Unique hash for the song
 */
function getSongHash(track) {
  if (!track || !track.artist || !track.title) {
    throw new Error('getSongHash requires track object with artist and title');
  }

  const hashInput = `${track.artist || ''}_${track.title || ''}_${track.album || ''}`.toLowerCase();
  return hashString(hashInput);
}

/**
 * Generate a user fingerprint hash from browser characteristics
 * @param {Object} fingerprint - Browser fingerprint data
 * @returns {string} Unique hash for the user
 */
function getUserFingerprintHash(fingerprint) {
  if (!fingerprint || typeof fingerprint !== 'object') {
    throw new Error('getUserFingerprintHash requires fingerprint object');
  }

  const fingerprintString = JSON.stringify(fingerprint);
  return hashString(fingerprintString);
}

/**
 * Generate a time-based hash with optional prefix
 * @param {string} [prefix=''] - Optional prefix for the hash
 * @returns {string} Time-based hash string
 */
function generateTimeHash(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const combined = `${prefix}_${timestamp}_${random}`;
  return hashString(combined);
}

/**
 * Validate hash format (base36 string)
 * @param {string} hash - Hash to validate
 * @returns {boolean} True if valid hash format
 */
function isValidHash(hash) {
  if (typeof hash !== 'string') return false;
  return /^[0-9a-z]+$/i.test(hash);
}

// Browser-compatible export (for frontend usage)
if (typeof window !== 'undefined') {
  window.HashUtils = {
    hashString,
    getSongHash,
    getUserFingerprintHash,
    generateTimeHash,
    isValidHash
  };
}

// Node.js export (for backend usage)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hashString,
    getSongHash,
    getUserFingerprintHash,
    generateTimeHash,
    isValidHash
  };
}