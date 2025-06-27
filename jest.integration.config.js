export default {
  displayName: 'integration',

  // Use jest-puppeteer preset for Puppeteer integration
  preset: 'jest-puppeteer',

  // Jest 30 performance optimizations
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',

  // Jest 30 new features
  waitForUnhandledRejections: true,

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/test/integration/setup/jest-setup.js'
  ],

  // Test file patterns - Only integration tests
  testMatch: [
    '<rootDir>/test/integration/**/*.test.js'
  ],

  // Standard Jest ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/setup/',
    '/test/integration/.build/'
  ],

  // Module directories (equivalent to webpack resolve.modules)
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Transform files using babel-jest for ESM support
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      configFile: './test/babel.config.cjs'
    }]
  },

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Cache directory for better performance
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/integration',

  // Test timeout - integration tests need more time
  testTimeout: 30000,

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage/integration',

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],

  // Global variables
  globals: {
    'NODE_ENV': 'test',
    'jest-puppeteer': {
      config: '<rootDir>/test/jest-puppeteer.config.js'
    }
  }
};

