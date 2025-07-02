/**
 * Test harness for integration tests
 * Provides modular initialization and configuration for different test scenarios
 */

import {init as initModel} from 'modules/pgpModel';
import {init as initKeyring} from 'modules/keyring';
import {initController} from 'controller/main.controller';
import {prefs} from 'modules/prefs';
import {init as initClientAPI} from 'client-API/client-api';
import {init as initClientAPIContentScript} from 'content-scripts/clientAPI';
import EncryptFrame from 'content-scripts/encryptFrame';
import ExtractFrame from 'content-scripts/extractFrame';
import * as providerSpecific from 'content-scripts/providerSpecific';
import {testAutocryptHeaders} from '../../fixtures/headers';

// Import integration-specific mocks
import {createMockEventHandler} from '../__mocks__/lib/EventHandler';
import {createMockProvider} from '../__mocks__/content-scripts/providers';

// Mock registry for auto-reset
const mockRegistry = new Set();

// Test harness API exposed to tests
window.testHarness = {
  /**
   * Core initialization - should be called in beforeEach
   * Initializes controller, model, and keyring
   */
  initCore: async () => {
    try {
      initController();
      await initModel();
      await initKeyring();
    } catch (error) {
      console.error('testHarness.initCore: Failed to initialize core components:', error);
      throw error;
    }
  },

  /**
   * Client API initialization - should be called in beforeAll for client-API tests only
   * Initializes client API and content script components
   */
  initClientAPI: () => {
    try {
      initClientAPI();
      initClientAPIContentScript();
    } catch (error) {
      console.error('testHarness.initClientAPI: Failed to initialize client API:', error);
      throw error;
    }
  },

  /**
   * Reset function - should be called in afterEach
   * Clears storage and listeners
   */
  reset: async () => {
    try {
      // Reset all registered mocks
      mockRegistry.forEach(mock => {
        if (mock.reset && typeof mock.reset === 'function') {
          mock.reset();
        }
      });

      window.chrome?._resetMockState();
    } catch (error) {
      console.error('testHarness.reset: Failed to reset:', error);
      throw error;
    }
  },

  /**
   * Set preferences for a specific test
   * @param {Object} prefUpdates - Object with preference updates to merge
   */
  setPrefs: prefUpdates => {
    try {
      // Deep merge preferences
      const deepMerge = (target, source) => {
        Object.keys(source).forEach(key => {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {};
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        });
      };
      deepMerge(prefs, prefUpdates);
    } catch (error) {
      console.error('testHarness.setPrefs: Failed to set preferences:', error);
      throw error;
    }
  },

  /**
   * Get current preferences
   * @returns {Object} Current preferences object
   */
  getPrefs: () => prefs,

  /**
   * Get test fixtures
   * @returns {Object} Test fixtures
   */
  getFixtures: () => ({
    testAutocryptHeaders
  }),

  /**
   * Get content script classes for testing
   * @returns {Object} Content script classes
   */
  getContentScripts: () => ({
    EncryptFrame,
    ExtractFrame,
    providerSpecific
  }),

  /**
   * Get mock instances for testing
   * @param {string} name - Mock name
   * @param {Object} config - Mock configuration
   * @returns {Object} Mock instance
   */
  getMock: (name, config = {}) => {
    const mocks = {
      'EventHandler': createMockEventHandler,
      'Provider': createMockProvider
    };
    if (!mocks[name]) {
      throw new Error(`Mock '${name}' not found. Available mocks: ${Object.keys(mocks).join(', ')}`);
    }
    const mockInstance = mocks[name](config);
    // Register mock for auto-reset
    mockRegistry.add(mockInstance);
    return mockInstance;
  },

  /**
   * Clear mock registry (for cleanup)
   */
  clearMockRegistry: () => {
    mockRegistry.clear();
  }
};

