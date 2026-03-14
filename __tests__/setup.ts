/**
 * Jest setup for rez-admin
 *
 * Mocks Expo modules + React Native APIs that aren't available in Node test env.
 */

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'http://localhost:5001/api',
        apiTimeout: '15000',
        socketUrl: 'http://localhost:5001',
      },
    },
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock AbortController (already in Node 18+, but ensure it exists)
if (typeof AbortController === 'undefined') {
  (global as any).AbortController = class {
    signal = { aborted: false };
    abort() {
      (this.signal as any).aborted = true;
    }
  };
}

// Suppress console noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Reset fetch mock between tests
afterEach(() => {
  (global.fetch as jest.Mock).mockReset();
});
