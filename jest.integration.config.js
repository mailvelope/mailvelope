export default {
  displayName: 'integration',

  // Drive Puppeteer directly via a custom environment + global setup/teardown
  testEnvironment: '<rootDir>/test/integration/setup/puppeteer-environment.js',
  globalSetup: '<rootDir>/test/integration/setup/global-setup.js',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.js',

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

  // Ignore unit test mocks to avoid duplicate mock warnings
  modulePathIgnorePatterns: [
    '<rootDir>/test/unit/__mocks__'
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

  // Global variables
  globals: {
    'NODE_ENV': 'test'
  }
};

