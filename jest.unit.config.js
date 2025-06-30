export default {
  displayName: 'unit',

  // Use jsdom environment for DOM testing (React components)
  testEnvironment: 'jsdom',

  // Jest 30 performance optimizations
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',

  // Jest 30 new features
  waitForUnhandledRejections: true,

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/test/unit/jest.setup.js'
  ],

  // Test file patterns - Only look for unit tests
  testMatch: [
    '<rootDir>/test/unit/**/*.test.js'
  ],

  // Standard Jest ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Ignore integration test mocks to avoid duplicate mock warnings
  modulePathIgnorePatterns: [
    '<rootDir>/test/integration/__mocks__'
  ],

  // Module name mapping for specific aliases and assets
  moduleNameMapper: {
    // Essential webpack aliases
    '^text-encoding$': '<rootDir>/src/lib/string-encoding.js',

    // Asset mocking (Note: CSS transforms are handled in transform section below)
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/test/unit/__mocks__/fileMock.js',
    '\\.(asc)$': '<rootDir>/test/unit/__mocks__/ascMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/test/unit/__mocks__/cssTransform.js'
  },

  // Module directories (equivalent to webpack resolve.modules)
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Transform files using babel-jest for JSX and modern JS
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      configFile: './test/babel.config.cjs'
    }]
  },

  // In general node_modules are not transformed, except ES modules that need it
  transformIgnorePatterns: [
    'node_modules/'
    //'node_modules/(?!(@openpgp/web-stream-tools|emailjs-mime-builder)/)'
  ],

  // Collect coverage from source files - Focus on core modules
  collectCoverageFrom: [
    'src/app/**/*.js',
    'src/client-API/**/*.js',
    'src/components/**/*.js',
    'src/content-scripts/**/*.js',
    'src/controller/**/*.js',
    'src/lib/**/*.js',
    'src/modules/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!**/node_modules/**'
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage/unit',

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Cache directory for better performance
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/unit',

  // Test timeout (in milliseconds) - Crypto operations need more time
  testTimeout: 10000,

  // Handle imports with file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'css',
    'scss',
    'sass'
  ],

  // Global variables
  globals: {
    'NODE_ENV': 'test'
  }
};
