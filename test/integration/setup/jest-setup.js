/**
 * Jest setup for integration tests
 * Uses top-level await (Jest 30 feature)
 */

import path from 'path';

// Global setup for Puppeteer tests
global.testPageUrl = `file://${path.resolve(__dirname, 'test-page.html')}`;

// Auto-setup debug logging for all integration tests
const isDebug = process.env.NODE_ENV === 'debug' ||
                process.argv.includes('--debug') ||
                process.argv.includes('--verbose');

// Setup global beforeAll to configure debug logging
beforeAll(async () => {
  if (isDebug && global.page) {
    global.page.on('console', msg => {
      console.log('Page console:', msg.type(), msg.text());
    });
    global.page.on('pageerror', error => {
      console.error('Page error:', error.message);
      console.error('Stack:', error.stack);
    });
  }
});

// Suppress specific console messages in tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Puppeteer') ||
      args[0]?.includes?.('old Headless')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

