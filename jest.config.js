export default {
  // Global options: Jest ignores them in the project configs
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],

  projects: [
    '<rootDir>/jest.unit.config.js',
    '<rootDir>/jest.integration.config.js'
    // '<rootDir>/jest.e2e.config.js'
  ]
};
