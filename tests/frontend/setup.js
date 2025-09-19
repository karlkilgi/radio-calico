// Frontend test setup
// Fix for webidl-conversions error with MSW in Node.js
import { beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';

// Polyfill for util.types.isProxy which is missing in Node.js < 20
// This polyfill is kept for backwards compatibility but shouldn't be needed with Node 20+
import util from 'util';
if (!util.types || !util.types.isProxy) {
  if (!globalThis.util) {
    globalThis.util = {};
  }
  if (!globalThis.util.types) {
    globalThis.util.types = {};
  }
  if (!globalThis.util.types.isProxy) {
    globalThis.util.types.isProxy = () => false;
  }
}

import '@testing-library/jest-dom';
import { server } from './mocks/server.js';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock window.localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock Audio API
global.Audio = class Audio {
  constructor() {
    this.play = vi.fn().mockResolvedValue(undefined);
    this.pause = vi.fn();
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
    this.src = '';
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 0;
    this.paused = true;
    this.ended = false;
    this.canPlayType = vi.fn().mockReturnValue('');
  }
};

// Mock HLS.js
global.Hls = class Hls {
  constructor(config) {
    this.config = config;
    this.levels = [];
    this.currentLevel = -1;
    this.loadSource = vi.fn();
    this.attachMedia = vi.fn();
    this.on = vi.fn();
    this.destroy = vi.fn();
  }

  static isSupported() {
    return true;
  }

  static get Events() {
    return {
      MANIFEST_PARSED: 'hlsManifestParsed',
      MEDIA_ATTACHED: 'hlsMediaAttached',
      ERROR: 'hlsError',
      LEVEL_SWITCHING: 'hlsLevelSwitching',
      LEVEL_SWITCHED: 'hlsLevelSwitched'
    };
  }
};

// Mock canvas and WebGL for fingerprinting
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === '2d') {
    return {
      fillText: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      textBaseline: '',
      font: ''
    };
  }
  if (type === 'webgl' || type === 'experimental-webgl') {
    return {
      getExtension: vi.fn(() => ({
        UNMASKED_RENDERER_WEBGL: 'UNMASKED_RENDERER_WEBGL'
      })),
      getParameter: vi.fn(() => 'Mock WebGL Renderer')
    };
  }
  return null;
});

// Mock navigator properties
Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 4
});

Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 8
});

// Mock screen properties
Object.defineProperty(screen, 'width', {
  writable: true,
  value: 1920
});

Object.defineProperty(screen, 'height', {
  writable: true,
  value: 1080
});

Object.defineProperty(screen, 'colorDepth', {
  writable: true,
  value: 24
});

// Mock Intl.DateTimeFormat
global.Intl = {
  DateTimeFormat: vi.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' })
  }))
};

// Reset DOM before each test
beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
});