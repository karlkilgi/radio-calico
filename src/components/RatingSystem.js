/**
 * Rating System Component for RadioCalico
 * Handles song rating functionality with thumbs up/down system
 */

class RatingSystem {
  constructor(options = {}) {
    this.userId = options.userId;
    this.apiUrl = options.apiUrl || '/api';
    this.currentTrack = null;
    this.hashUtils = options.hashUtils || window.HashUtils;

    // DOM element selectors
    this.selectors = {
      thumbsUpBtn: options.thumbsUpSelector || '#thumbsUpBtn',
      thumbsDownBtn: options.thumbsDownSelector || '#thumbsDownBtn',
      thumbsUpCount: options.thumbsUpCountSelector || '#thumbsUpCount',
      thumbsDownCount: options.thumbsDownCountSelector || '#thumbsDownCount',
      ...options.selectors
    };

    // Event handlers
    this.onRatingChange = options.onRatingChange || (() => {});
    this.onError = options.onError || ((error) => console.error('Rating error:', error));

    this.initialized = false;
  }

  /**
   * Initialize the rating system
   * @param {Object} track - Current track information
   * @returns {Promise<void>}
   */
  async initialize(track = null) {
    if (this.initialized) return;

    try {
      this.setupRatingButtons();

      if (track) {
        await this.setCurrentTrack(track);
      }

      this.initialized = true;
    } catch (error) {
      this.onError(error);
      throw error;
    }
  }

  /**
   * Set up event listeners for rating buttons
   */
  setupRatingButtons() {
    const thumbsUpBtn = document.querySelector(this.selectors.thumbsUpBtn);
    const thumbsDownBtn = document.querySelector(this.selectors.thumbsDownBtn);

    if (!thumbsUpBtn || !thumbsDownBtn) {
      throw new Error('Rating buttons not found in DOM');
    }

    // Remove existing listeners to prevent duplicates
    thumbsUpBtn.removeEventListener('click', this._handleThumbsUp);
    thumbsDownBtn.removeEventListener('click', this._handleThumbsDown);

    // Bind event handlers to maintain context
    this._handleThumbsUp = this._handleThumbsUp.bind(this);
    this._handleThumbsDown = this._handleThumbsDown.bind(this);

    // Add event listeners
    thumbsUpBtn.addEventListener('click', this._handleThumbsUp);
    thumbsDownBtn.addEventListener('click', this._handleThumbsDown);
  }

  /**
   * Handle thumbs up button click
   */
  async _handleThumbsUp() {
    await this.rateSong(1);
  }

  /**
   * Handle thumbs down button click
   */
  async _handleThumbsDown() {
    await this.rateSong(-1);
  }

  /**
   * Set current track and load its ratings
   * @param {Object} track - Track information
   * @returns {Promise<void>}
   */
  async setCurrentTrack(track) {
    if (!track || !track.artist || !track.title) {
      throw new Error('Invalid track data provided');
    }

    this.currentTrack = track;
    await this.loadRatings();
  }

  /**
   * Load ratings for the current track
   * @returns {Promise<void>}
   */
  async loadRatings() {
    if (!this.currentTrack || !this.userId) {
      return;
    }

    try {
      const songHash = this.hashUtils.getSongHash(this.currentTrack);

      // Load total ratings
      const ratingsResponse = await fetch(`${this.apiUrl}/song/${songHash}/ratings`);
      if (ratingsResponse.ok) {
        const ratings = await ratingsResponse.json();
        this.updateRatingCounts(ratings.thumbs_up || 0, ratings.thumbs_down || 0);
      }

      // Load user's rating
      const userRatingResponse = await fetch(`${this.apiUrl}/song/${songHash}/user-rating/${this.userId}`);
      if (userRatingResponse.ok) {
        const userRating = await userRatingResponse.json();
        this.updateRatingButtons(userRating.rating);
      }
    } catch (error) {
      this.onError(error);
    }
  }

  /**
   * Submit a rating for the current track
   * @param {number} rating - Rating value (1 for thumbs up, -1 for thumbs down)
   * @returns {Promise<void>}
   */
  async rateSong(rating) {
    if (!this.currentTrack || !this.userId) {
      this.onError(new Error('Missing track or user information'));
      return;
    }

    if (rating !== 1 && rating !== -1) {
      this.onError(new Error('Rating must be 1 (thumbs up) or -1 (thumbs down)'));
      return;
    }

    try {
      const songHash = this.hashUtils.getSongHash(this.currentTrack);

      const response = await fetch(`${this.apiUrl}/song/${songHash}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          userId: this.userId,
          title: this.currentTrack.title,
          artist: this.currentTrack.artist,
          album: this.currentTrack.album
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.updateRatingCounts(result.thumbs_up || 0, result.thumbs_down || 0);
        this.updateRatingButtons(rating);

        // Notify listeners of rating change
        this.onRatingChange({
          track: this.currentTrack,
          rating: rating,
          totals: {
            thumbs_up: result.thumbs_up || 0,
            thumbs_down: result.thumbs_down || 0
          }
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit rating');
      }
    } catch (error) {
      this.onError(error);
    }
  }

  /**
   * Update rating count displays
   * @param {number} thumbsUp - Number of thumbs up
   * @param {number} thumbsDown - Number of thumbs down
   */
  updateRatingCounts(thumbsUp, thumbsDown) {
    const thumbsUpCountEl = document.querySelector(this.selectors.thumbsUpCount);
    const thumbsDownCountEl = document.querySelector(this.selectors.thumbsDownCount);

    if (thumbsUpCountEl) {
      thumbsUpCountEl.textContent = thumbsUp.toString();
    }

    if (thumbsDownCountEl) {
      thumbsDownCountEl.textContent = thumbsDown.toString();
    }
  }

  /**
   * Update rating button states based on user's rating
   * @param {number|null} userRating - User's current rating (1, -1, or null)
   */
  updateRatingButtons(userRating) {
    const thumbsUpBtn = document.querySelector(this.selectors.thumbsUpBtn);
    const thumbsDownBtn = document.querySelector(this.selectors.thumbsDownBtn);

    if (!thumbsUpBtn || !thumbsDownBtn) return;

    // Reset button states
    thumbsUpBtn.classList.remove('active');
    thumbsDownBtn.classList.remove('active');

    // Set active state based on user rating
    if (userRating === 1) {
      thumbsUpBtn.classList.add('active');
    } else if (userRating === -1) {
      thumbsDownBtn.classList.add('active');
    }
  }

  /**
   * Get current rating summary
   * @returns {Object|null} Current rating data
   */
  getCurrentRating() {
    if (!this.currentTrack) return null;

    const thumbsUpCountEl = document.querySelector(this.selectors.thumbsUpCount);
    const thumbsDownCountEl = document.querySelector(this.selectors.thumbsDownCount);
    const thumbsUpBtn = document.querySelector(this.selectors.thumbsUpBtn);
    const thumbsDownBtn = document.querySelector(this.selectors.thumbsDownBtn);

    return {
      track: this.currentTrack,
      totals: {
        thumbs_up: parseInt(thumbsUpCountEl?.textContent || '0', 10),
        thumbs_down: parseInt(thumbsDownCountEl?.textContent || '0', 10)
      },
      userRating: thumbsUpBtn?.classList.contains('active') ? 1 :
                  (thumbsDownBtn?.classList.contains('active') ? -1 : null)
    };
  }

  /**
   * Reset the rating system
   */
  reset() {
    this.currentTrack = null;
    this.updateRatingCounts(0, 0);
    this.updateRatingButtons(null);
  }

  /**
   * Destroy the rating system and clean up event listeners
   */
  destroy() {
    const thumbsUpBtn = document.querySelector(this.selectors.thumbsUpBtn);
    const thumbsDownBtn = document.querySelector(this.selectors.thumbsDownBtn);

    if (thumbsUpBtn) {
      thumbsUpBtn.removeEventListener('click', this._handleThumbsUp);
    }

    if (thumbsDownBtn) {
      thumbsDownBtn.removeEventListener('click', this._handleThumbsDown);
    }

    this.initialized = false;
    this.currentTrack = null;
  }
}

// Browser-compatible export
if (typeof window !== 'undefined') {
  window.RatingSystem = RatingSystem;
}

// Node.js export (for testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RatingSystem;
}