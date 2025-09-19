import { http, HttpResponse } from 'msw';

// Mock song data
const mockSongs = new Map();
const mockRatings = new Map();

// Initialize some test data
const testSongHash = 'test123';
mockSongs.set(testSongHash, {
  id: 1,
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  song_hash: testSongHash
});

mockRatings.set(testSongHash, {
  thumbs_up: 5,
  thumbs_down: 2,
  userRatings: new Map([
    ['user123', 1],
    ['user456', -1]
  ])
});

export const handlers = [
  // Get song ratings
  http.get('/api/song/:songHash/ratings', ({ params }) => {
    const { songHash } = params;
    const ratings = mockRatings.get(songHash) || { thumbs_up: 0, thumbs_down: 0 };

    return HttpResponse.json({
      thumbs_up: ratings.thumbs_up || 0,
      thumbs_down: ratings.thumbs_down || 0
    });
  }),

  // Submit song rating
  http.post('/api/song/:songHash/rate', async ({ request, params }) => {
    const { songHash } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.rating || !body.userId || !body.title || !body.artist) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate rating value
    if (body.rating !== 1 && body.rating !== -1) {
      return HttpResponse.json(
        { error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' },
        { status: 400 }
      );
    }

    // Add song if it doesn't exist
    if (!mockSongs.has(songHash)) {
      mockSongs.set(songHash, {
        id: Date.now(),
        title: body.title,
        artist: body.artist,
        album: body.album,
        song_hash: songHash
      });
    }

    // Get or create ratings for this song
    let ratings = mockRatings.get(songHash) || {
      thumbs_up: 0,
      thumbs_down: 0,
      userRatings: new Map()
    };

    // Update user's rating
    const previousRating = ratings.userRatings.get(body.userId);
    ratings.userRatings.set(body.userId, body.rating);

    // Recalculate totals
    let thumbsUp = 0;
    let thumbsDown = 0;

    for (const rating of ratings.userRatings.values()) {
      if (rating === 1) thumbsUp++;
      else if (rating === -1) thumbsDown++;
    }

    ratings.thumbs_up = thumbsUp;
    ratings.thumbs_down = thumbsDown;
    mockRatings.set(songHash, ratings);

    return HttpResponse.json({
      message: 'Rating submitted successfully',
      thumbs_up: ratings.thumbs_up,
      thumbs_down: ratings.thumbs_down
    });
  }),

  // Get user's rating for a song
  http.get('/api/song/:songHash/user-rating/:userId', ({ params }) => {
    const { songHash, userId } = params;
    const ratings = mockRatings.get(songHash);

    if (!ratings || !ratings.userRatings.has(userId)) {
      return HttpResponse.json({ rating: null });
    }

    return HttpResponse.json({
      rating: ratings.userRatings.get(userId)
    });
  }),

  // Get client IP
  http.get('/api/client-ip', ({ request }) => {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    return HttpResponse.json({
      ip: forwarded || realIp || '127.0.0.1'
    });
  }),

  // Get users
  http.get('/api/users', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test User 1',
        email: 'test1@example.com',
        created_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Test User 2',
        email: 'test2@example.com',
        created_at: '2023-01-02T00:00:00Z'
      }
    ]);
  }),

  // Create user
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();

    if (!body.name || !body.email) {
      return HttpResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Simulate duplicate email check
    if (body.email === 'duplicate@example.com') {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      id: Date.now(),
      name: body.name,
      email: body.email,
      created_at: new Date().toISOString()
    }, { status: 201 });
  }),

  // Mock metadata endpoint
  http.get('https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json', () => {
    return HttpResponse.json({
      artist: 'Mock Artist',
      title: 'Mock Song Title',
      album: 'Mock Album',
      date: '2023',
      bit_depth: '24',
      sample_rate: '48000',
      prev_artist_1: 'Previous Artist 1',
      prev_title_1: 'Previous Title 1',
      prev_artist_2: 'Previous Artist 2',
      prev_title_2: 'Previous Title 2',
      prev_artist_3: 'Previous Artist 3',
      prev_title_3: 'Previous Title 3'
    });
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  })
];

// Helper functions for tests
export const resetMockData = () => {
  mockSongs.clear();
  mockRatings.clear();

  // Reinitialize test data
  mockSongs.set(testSongHash, {
    id: 1,
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    song_hash: testSongHash
  });

  mockRatings.set(testSongHash, {
    thumbs_up: 5,
    thumbs_down: 2,
    userRatings: new Map([
      ['user123', 1],
      ['user456', -1]
    ])
  });
};

export const addMockSong = (songHash, songData) => {
  mockSongs.set(songHash, songData);
};

export const addMockRating = (songHash, ratingsData) => {
  mockRatings.set(songHash, ratingsData);
};

export const getMockRatings = (songHash) => {
  return mockRatings.get(songHash);
};