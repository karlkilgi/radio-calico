import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the RadioPlayer class
class MockRadioPlayer {
  constructor() {
    this.audio = document.getElementById('audioPlayer');
    this.playBtn = document.getElementById('playBtn');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.status = document.getElementById('status');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.isPlaying = false;
    this.hls = null;
    this.startTime = null;
    this.elapsedTimer = null;
    this.currentStreamQuality = null;
  }

  init() {
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
    this.audio.volume = 0.8;
    this.setupHLS();
  }

  setupHLS() {
    if (Hls.isSupported()) {
      this.hls = {
        loadSource: vi.fn(),
        attachMedia: vi.fn(),
        on: vi.fn(),
        destroy: vi.fn(),
        levels: [],
        currentLevel: -1
      };
    } else if (this.audio.canPlayType('application/vnd.apple.mpegurl')) {
      this.audio.src = 'https://test-stream.m3u8';
    }
  }

  async togglePlay() {
    try {
      if (this.isPlaying) {
        this.audio.pause();
        this.playBtn.innerHTML = '▶';
        this.isPlaying = false;
        this.stopTimer();
      } else {
        await this.audio.play();
        this.playBtn.innerHTML = '⏸';
        this.isPlaying = true;
        this.startTimer();
      }
    } catch (error) {
      this.updateStatus('Playback failed - check connection', 'error');
    }
  }

  setVolume(value) {
    this.audio.volume = value / 100;
  }

  updateStatus(message, className) {
    this.status.textContent = message;
    this.status.className = `status ${className}`;
  }

  startTimer() {
    this.startTime = Date.now();
    this.elapsedTimer = setInterval(() => {
      this.updateElapsedTime();
    }, 1000);
  }

  stopTimer() {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.timeDisplay.textContent = '00:00:00';
  }

  updateElapsedTime() {
    if (this.startTime && this.isPlaying) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      this.timeDisplay.textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  updateStreamQuality() {
    const fallbackText = 'Stream quality: Adaptive (HLS)';
    this.currentStreamQuality = fallbackText;
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

  getSongHash(track) {
    const hashString = `${track.artist || ''}_${track.title || ''}_${track.album || ''}`.toLowerCase();
    return this.hashString(hashString);
  }
}

describe('Audio Player', () => {
  let player;
  let audioElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <audio id="audioPlayer"></audio>
      <button id="playBtn">▶</button>
      <input id="volumeSlider" type="range" min="0" max="100" value="80" />
      <div id="status"></div>
      <div id="timeDisplay">00:00:00</div>
    `;

    audioElement = document.getElementById('audioPlayer');
    player = new MockRadioPlayer();
  });

  afterEach(() => {
    if (player.elapsedTimer) {
      clearInterval(player.elapsedTimer);
    }
  });

  test('should initialize with correct default values', () => {
    expect(player.isPlaying).toBe(false);
    expect(player.startTime).toBeNull();
    expect(player.elapsedTimer).toBeNull();
  });

  test('should initialize HLS when supported', () => {
    global.Hls.isSupported = vi.fn().mockReturnValue(true);

    player.init();
    player.setupHLS();

    expect(player.hls).toBeDefined();
    expect(player.hls.loadSource).toBeDefined();
    expect(player.hls.attachMedia).toBeDefined();
  });

  test('should set initial volume to 0.8', () => {
    player.init();
    expect(audioElement.volume).toBe(0.8);
  });

  test('should toggle play/pause state', async () => {
    player.init();
    const playBtn = document.getElementById('playBtn');

    // Mock audio play/pause
    audioElement.play = vi.fn().mockResolvedValue(undefined);
    audioElement.pause = vi.fn();

    // Initial state should be not playing
    expect(player.isPlaying).toBe(false);
    expect(playBtn.innerHTML).toBe('▶');

    // Click play
    await player.togglePlay();
    expect(player.isPlaying).toBe(true);
    expect(playBtn.innerHTML).toBe('⏸');
    expect(audioElement.play).toHaveBeenCalled();

    // Click pause
    await player.togglePlay();
    expect(player.isPlaying).toBe(false);
    expect(playBtn.innerHTML).toBe('▶');
    expect(audioElement.pause).toHaveBeenCalled();
  });

  test('should handle playback errors gracefully', async () => {
    player.init();
    audioElement.play = vi.fn().mockRejectedValue(new Error('Playback failed'));

    await player.togglePlay();

    const status = document.getElementById('status');
    expect(status.textContent).toBe('Playback failed - check connection');
    expect(status.className).toBe('status error');
  });

  test('should update volume correctly', () => {
    player.init();

    player.setVolume(50);
    expect(audioElement.volume).toBe(0.5);

    player.setVolume(100);
    expect(audioElement.volume).toBe(1);

    player.setVolume(0);
    expect(audioElement.volume).toBe(0);
  });

  test('should update status message and class', () => {
    player.init();
    const status = document.getElementById('status');

    player.updateStatus('Loading...', 'loading');
    expect(status.textContent).toBe('Loading...');
    expect(status.className).toBe('status loading');

    player.updateStatus('Playing', 'playing');
    expect(status.textContent).toBe('Playing');
    expect(status.className).toBe('status playing');
  });

  test('should start and stop timer correctly', () => {
    vi.useFakeTimers();
    player.init();

    // Start timer
    player.startTimer();
    expect(player.startTime).toBeDefined();
    expect(player.elapsedTimer).toBeDefined();

    // Stop timer
    player.stopTimer();
    expect(player.elapsedTimer).toBeNull();
    expect(document.getElementById('timeDisplay').textContent).toBe('00:00:00');

    vi.useRealTimers();
  });

  test('should format elapsed time correctly', () => {
    vi.useFakeTimers();
    player.init();
    player.isPlaying = true;

    // Set start time to simulate 1 hour, 23 minutes, 45 seconds ago
    const elapsed = (1 * 3600 + 23 * 60 + 45) * 1000; // in milliseconds
    player.startTime = Date.now() - elapsed;

    player.updateElapsedTime();

    expect(document.getElementById('timeDisplay').textContent).toBe('01:23:45');

    vi.useRealTimers();
  });

  test('should update stream quality text', () => {
    player.init();
    player.updateStreamQuality();
    expect(player.currentStreamQuality).toBe('Stream quality: Adaptive (HLS)');
  });

  test('should generate consistent song hash', () => {
    const track = {
      artist: 'Test Artist',
      title: 'Test Song',
      album: 'Test Album'
    };

    const hash1 = player.getSongHash(track);
    const hash2 = player.getSongHash(track);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  test('should handle missing track information in hash generation', () => {
    const track1 = { artist: 'Artist', title: 'Title' };
    const track2 = { artist: 'Artist', title: 'Title', album: undefined };

    const hash1 = player.getSongHash(track1);
    const hash2 = player.getSongHash(track2);

    expect(hash1).toBe(hash2);
  });

  test('should hash string consistently', () => {
    const testString = 'test string for hashing';

    const hash1 = player.hashString(testString);
    const hash2 = player.hashString(testString);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');

    // Different strings should produce different hashes
    const hash3 = player.hashString('different string');
    expect(hash1).not.toBe(hash3);
  });

  test('should handle volume slider input events', () => {
    player.init();
    const volumeSlider = document.getElementById('volumeSlider');

    // Simulate volume change
    volumeSlider.value = 75;
    volumeSlider.dispatchEvent(new Event('input'));

    expect(audioElement.volume).toBe(0.75);
  });

  test('should handle play button click events', async () => {
    player.init();
    const playBtn = document.getElementById('playBtn');

    audioElement.play = vi.fn().mockResolvedValue(undefined);
    audioElement.pause = vi.fn();

    // Simulate play button click
    playBtn.click();
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

    expect(player.isPlaying).toBe(true);
    expect(audioElement.play).toHaveBeenCalled();
  });
});