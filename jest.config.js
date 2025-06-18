export default {
  // Use jsdom environment for DOM testing (React components)
  testEnvironment: 'jsdom',

  // Jest 30 performance optimizations
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',

  // Jest 30 new features
  waitForUnhandledRejections: true,

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/test/jest.setup.js'
  ],

  // Test file patterns - Jest will look for tests in test/app and test/components only
  testMatch: [
    '<rootDir>/test/app/**/*-test.js',
    '<rootDir>/test/components/**/*-test.js'
  ],

  // Standard Jest ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Module name mapping for specific aliases and assets
  moduleNameMapper: {
    // Essential webpack aliases
    '^text-encoding$': '<rootDir>/src/lib/string-encoding.js',
    '^utils$': '<rootDir>/test/utils.js',
    '^Fixtures(.*)$': '<rootDir>/test/fixtures$1',

    // Asset mocking (Note: CSS transforms are handled in transform section below)
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/test/__mocks__/fileMock.js',
    '\\.(asc)$': '<rootDir>/test/__mocks__/ascMock.js'
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
    }],
    '\\.(css|less|scss|sass)$': '<rootDir>/test/__mocks__/cssTransform.js'
  },

  // Don't transform ES modules - Jest 30 handles them natively
  // Avoid transforming large crypto libraries for better performance
  transformIgnorePatterns: [
    'node_modules/(?!(openpgp|@openpgp|@testing-library)/)'
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
  coverageDirectory: '<rootDir>/coverage',

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
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Test timeout (in milliseconds) - Crypto operations need more time
  testTimeout: 10000,

  // Verbose output
  verbose: true,

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
