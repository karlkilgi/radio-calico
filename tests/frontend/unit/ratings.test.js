import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock rating functionality
class MockRatingSystem {
  constructor() {
    this.userId = 'test_user_123';
    this.currentTrack = null;
  }

  setupRatingButtons() {
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

    if (thumbsUpBtn && thumbsDownBtn) {
      thumbsUpBtn.addEventListener('click', () => this.rateSong(1));
      thumbsDownBtn.addEventListener('click', () => this.rateSong(-1));
    }
  }

  async loadRatings() {
    if (!this.currentTrack || !this.userId) return;

    try {
      const songHash = this.getSongHash(this.currentTrack);

      // Load total ratings
      const ratingsResponse = await fetch(`/api/song/${songHash}/ratings`);
      if (ratingsResponse.ok) {
        const ratings = await ratingsResponse.json();
        document.getElementById('thumbsUpCount').textContent = ratings.thumbs_up;
        document.getElementById('thumbsDownCount').textContent = ratings.thumbs_down;
      }

      // Load user's rating
      const userRatingResponse = await fetch(`/api/song/${songHash}/user-rating/${this.userId}`);
      if (userRatingResponse.ok) {
        const userRating = await userRatingResponse.json();
        this.updateRatingButtons(userRating.rating);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  }

  updateRatingButtons(userRating) {
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

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

  async rateSong(rating) {
    if (!this.currentTrack || !this.userId) return;

    try {
      const songHash = this.getSongHash(this.currentTrack);
      const response = await fetch(`/api/song/${songHash}/rate`, {
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
        document.getElementById('thumbsUpCount').textContent = result.thumbs_up;
        document.getElementById('thumbsDownCount').textContent = result.thumbs_down;
        this.updateRatingButtons(rating);
        return result;
      } else {
        console.error('Failed to submit rating');
        return null;
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      return null;
    }
  }

  getSongHash(track) {
    const hashString = `${track.artist || ''}_${track.title || ''}_${track.album || ''}`.toLowerCase();
    return this.hashString(hashString);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

describe('Rating System', () => {
  let ratingSystem;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <button id="thumbsUpBtn" class="rating-button thumbs-up">
        <span>👍</span>
        <span class="rating-count" id="thumbsUpCount">0</span>
      </button>
      <button id="thumbsDownBtn" class="rating-button thumbs-down">
        <span>👎</span>
        <span class="rating-count" id="thumbsDownCount">0</span>
      </button>
    `;

    ratingSystem = new MockRatingSystem();
    ratingSystem.currentTrack = {
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album'
    };

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  test('should setup rating button event listeners', () => {
    ratingSystem.setupRatingButtons();

    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

    expect(thumbsUpBtn).toBeDefined();
    expect(thumbsDownBtn).toBeDefined();

    // Check if event listeners are attached (indirectly)
    const rateSongSpy = vi.spyOn(ratingSystem, 'rateSong');

    thumbsUpBtn.click();
    expect(rateSongSpy).toHaveBeenCalledWith(1);

    thumbsDownBtn.click();
    expect(rateSongSpy).toHaveBeenCalledWith(-1);
  });

  test('should submit thumbs up rating', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        message: 'Rating submitted successfully',
        thumbs_up: 1,
        thumbs_down: 0
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const result = await ratingSystem.rateSong(1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/song'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"rating":1')
      })
    );

    expect(result.thumbs_up).toBe(1);
    expect(result.thumbs_down).toBe(0);
  });

  test('should submit thumbs down rating', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        message: 'Rating submitted successfully',
        thumbs_up: 0,
        thumbs_down: 1
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const result = await ratingSystem.rateSong(-1);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/song'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rating":-1')
      })
    );

    expect(result.thumbs_up).toBe(0);
    expect(result.thumbs_down).toBe(1);
  });

  test('should update rating counts in DOM', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ thumbs_up: 5, thumbs_down: 2 })
    };
    global.fetch.mockResolvedValue(mockResponse);

    await ratingSystem.rateSong(1);

    expect(document.getElementById('thumbsUpCount').textContent).toBe('5');
    expect(document.getElementById('thumbsDownCount').textContent).toBe('2');
  });

  test('should update button active states', () => {
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

    // Test thumbs up active
    ratingSystem.updateRatingButtons(1);
    expect(thumbsUpBtn.classList.contains('active')).toBe(true);
    expect(thumbsDownBtn.classList.contains('active')).toBe(false);

    // Test thumbs down active
    ratingSystem.updateRatingButtons(-1);
    expect(thumbsUpBtn.classList.contains('active')).toBe(false);
    expect(thumbsDownBtn.classList.contains('active')).toBe(true);

    // Test no rating active
    ratingSystem.updateRatingButtons(null);
    expect(thumbsUpBtn.classList.contains('active')).toBe(false);
    expect(thumbsDownBtn.classList.contains('active')).toBe(false);
  });

  test('should load ratings from API', async () => {
    const ratingsResponse = {
      ok: true,
      json: async () => ({ thumbs_up: 10, thumbs_down: 3 })
    };
    const userRatingResponse = {
      ok: true,
      json: async () => ({ rating: 1 })
    };

    global.fetch
      .mockResolvedValueOnce(ratingsResponse)
      .mockResolvedValueOnce(userRatingResponse);

    await ratingSystem.loadRatings();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(document.getElementById('thumbsUpCount').textContent).toBe('10');
    expect(document.getElementById('thumbsDownCount').textContent).toBe('3');

    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    expect(thumbsUpBtn.classList.contains('active')).toBe(true);
  });

  test('should handle API errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await ratingSystem.rateSong(1);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error submitting rating:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  test('should handle failed API responses', async () => {
    const mockResponse = { ok: false, status: 400 };
    global.fetch.mockResolvedValue(mockResponse);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await ratingSystem.rateSong(1);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to submit rating');

    consoleSpy.mockRestore();
  });

  test('should not submit rating without current track', async () => {
    ratingSystem.currentTrack = null;

    const result = await ratingSystem.rateSong(1);

    expect(result).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('should not submit rating without user ID', async () => {
    ratingSystem.userId = null;

    const result = await ratingSystem.rateSong(1);

    expect(result).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('should generate consistent song hash', () => {
    const track = {
      artist: 'Test Artist',
      title: 'Test Song',
      album: 'Test Album'
    };

    const hash1 = ratingSystem.getSongHash(track);
    const hash2 = ratingSystem.getSongHash(track);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
  });

  test('should handle missing track properties in hash', () => {
    const incompleteTrack = {
      artist: 'Artist Only'
    };

    const hash = ratingSystem.getSongHash(incompleteTrack);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('should include all track data in rating request', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ thumbs_up: 1, thumbs_down: 0 })
    };
    global.fetch.mockResolvedValue(mockResponse);

    await ratingSystem.rateSong(1);

    const fetchCall = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody).toEqual({
      rating: 1,
      userId: 'test_user_123',
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album'
    });
  });

  test('should handle rating button clicks', () => {
    ratingSystem.setupRatingButtons();
    const rateSongSpy = vi.spyOn(ratingSystem, 'rateSong');

    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');

    thumbsUpBtn.click();
    expect(rateSongSpy).toHaveBeenCalledWith(1);

    thumbsDownBtn.click();
    expect(rateSongSpy).toHaveBeenCalledWith(-1);
  });

  test('should not crash when rating buttons are missing', () => {
    // Remove buttons from DOM
    document.body.innerHTML = '';

    expect(() => {
      ratingSystem.setupRatingButtons();
      ratingSystem.updateRatingButtons(1);
    }).not.toThrow();
  });
});