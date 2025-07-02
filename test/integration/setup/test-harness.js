/**
 * Test harness for integration tests
 * Provides modular initialization and configuration for different test scenarios
 */

import {init as initModel} from 'modules/pgpModel';
import {init as initKeyring, createKeyring} from 'modules/keyring';
import {initController, controllerPool} from 'controller/main.controller';
import {createController, verifyConnectPermission} from 'controller/factory';
import {prefs} from 'modules/prefs';
import {init as initClientAPI} from 'client-API/client-api';
import {init as initClientAPIContentScript} from 'content-scripts/clientAPI';
import EncryptFrame from 'content-scripts/encryptFrame';
import ExtractFrame from 'content-scripts/extractFrame';
import * as providerSpecific from 'content-scripts/providerSpecific';
import {testAutocryptHeaders} from '../../fixtures/headers';
import testKeys from '../../fixtures/keys';

// Import integration-specific mocks
import {createMockEventHandler} from '../__mocks__/lib/EventHandler';
import {createMockProvider} from '../__mocks__/content-scripts/providers';
import {createMockKeyring} from '../__mocks__/modules/keyring';
import {createMockKey} from '../__mocks__/modules/key';
import {createMockPgpModel} from '../__mocks__/modules/pgpModel';
import {createMockKeyRegistry} from '../__mocks__/modules/keyRegistry';
import {createMockMime} from '../__mocks__/modules/mime';
// Port is imported from chrome-api-setup.js which is loaded before this bundle

// Mock registry for auto-reset
const mockRegistry = new Set();

// Test data storage for persisting data across page.evaluate calls
const testDataStore = {};

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

      // Clear test data store
      Object.keys(testDataStore).forEach(key => {
        delete testDataStore[key];
      });

      // Clear module mocks
      window.testHarness.clearModuleMocks();

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
      'Provider': createMockProvider,
      'Keyring': createMockKeyring,
      'Key': createMockKey,
      'PgpModel': createMockPgpModel,
      'KeyRegistry': createMockKeyRegistry,
      'Mime': createMockMime
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
  },

  /**
   * Get controller factory for testing
   * @returns {Object} Controller factory functions
   */
  getControllerFactory: () => ({
    createController,
    verifyConnectPermission,
    controllerPool
  }),

  /**
   * Create a port connection for testing
   * @param {string} name - Port name
   * @returns {Port} The initiating port (use port._otherPort to access the receiving end)
   */
  createPortConnection: name =>
    // Use chrome.runtime.connect which is mocked in chrome-api-setup.js
    chrome.runtime.connect({name})
  ,

  /**
   * Store test-specific data that persists across page.evaluate calls
   * @param {string} key - The key to store data under
   * @param {any} data - The data to store (must be serializable)
   */
  setTestData: (key, data) => {
    if (typeof key !== 'string') {
      throw new Error('Test data key must be a string');
    }
    testDataStore[key] = data;
  },

  /**
   * Retrieve test-specific data
   * @param {string} key - The key to retrieve data for
   * @returns {any} The stored data, or undefined if not found
   */
  getTestData: key => testDataStore[key],

  /**
   * Clear specific test data or all test data
   * @param {string} [key] - Optional key to clear specific data, omit to clear all
   */
  clearTestData: key => {
    if (key) {
      delete testDataStore[key];
    } else {
      Object.keys(testDataStore).forEach(k => {
        delete testDataStore[k];
      });
    }
  },

  /**
   * Clear module mocks
   */
  clearModuleMocks: () => {
    delete window.__testMocks;
  },

  /**
   * Create a test keyring with the given ID
   * @param {string} keyringId - The keyring ID to create
   * @param {Object} options - Options for keyring creation
   * @param {boolean} options.importTestKeys - Whether to import test keys
   * @returns {Promise<void>}
   */
  createTestKeyring: async (keyringId, options = {}) => {
    try {
      await createKeyring(keyringId);
    } catch (e) {
      // Keyring might already exist, that's ok
      if (!e.message?.includes('already exists')) {
        throw e;
      }
    }

    // Import test keys if requested
    if (options.importTestKeys) {
      const {getById} = await import('modules/keyring');
      const keyring = await getById(keyringId);

      // Import test keys (api_test has both public and private)
      const keysToImport = [
        {armored: testKeys.api_test_pub, type: 'public'},
        {armored: testKeys.api_test_prv, type: 'private'},
        {armored: testKeys.johnd_pub, type: 'public'}
      ];

      for (const key of keysToImport) {
        try {
          await keyring.importKeys([{type: key.type, armored: key.armored}]);
        } catch (e) {
          console.warn('Failed to import test key:', e);
        }
      }
    }
  },

};

