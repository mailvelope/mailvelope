// Jest setup file - Framework essentials and browser APIs
import '@testing-library/jest-dom';
import './matchers/pgp-matchers';
import './matchers/port-matchers';
import {configure} from '@testing-library/react';
import {setupBrowserAPIs} from './__mocks__/browser-env';
import chrome from './__mocks__/chrome';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// Setup browser APIs globally
setupBrowserAPIs();

// Setup chrome API globally
global.chrome = chrome;

// Mock EventHandler at module level to prevent initialization issues
jest.mock('lib/EventHandler', () => ({
  connect: jest.fn()
}));

// Suppress console warnings for tests (can be enabled for debugging)
const originalWarn = console.warn;
console.warn = (...args) => {
  // Allow specific warnings through
  if (args[0]?.includes?.('validateDOMNesting') ||
      args[0]?.includes?.('Warning: ReactDOM.render')) {
    return;
  }
  originalWarn.apply(console, args);
};
