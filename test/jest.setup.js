// Jest setup file - Framework essentials and browser APIs
import '@testing-library/jest-dom';
import './matchers/pgp-matchers';
import './matchers/port-matchers';
import {configure} from '@testing-library/react';
import {setupDOMEnvironment} from './__mocks__/dom-environment';
import {setupServiceWorkerEnvironment} from './__mocks__/service-worker-env';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// Auto-detect test type based on file path and setup appropriate environment
const testPath = expect.getState().testPath;
if (testPath) {
  if (testPath.includes('/test/app/') || testPath.includes('/test/components/')) {
    // React component tests - DOM environment with limited Chrome APIs
    setupDOMEnvironment();
  } else if (testPath.includes('/test/controller/') ||
             testPath.includes('/test/lib/') ||
             testPath.includes('/test/modules/')) {
    // Background script tests - Service worker environment with full Chrome APIs
    setupServiceWorkerEnvironment();
  }
  // Other tests get no special environment setup
}

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
