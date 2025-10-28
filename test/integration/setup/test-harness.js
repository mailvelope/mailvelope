/**
 * Test harness for integration tests
 * Provides modular initialization and configuration for different test scenarios
 */

import {init as initModel} from 'modules/pgpModel';
import {init as initKeyring, createKeyring, getById} from 'modules/keyring';
import {initController, controllerPool} from 'controller/main.controller';
import {createController, verifyConnectPermission} from 'controller/factory';
import {prefs} from 'modules/prefs';
import {init as initClientAPI} from 'client-API/client-api';
import {init as initClientAPIContentScript} from 'content-scripts/clientAPI';
import EncryptFrame from 'content-scripts/encryptFrame';
import ExtractFrame from 'content-scripts/extractFrame';
import * as providerSpecific from 'content-scripts/providerSpecific';
import GmailIntegration from 'content-scripts/gmailIntegration';
import * as csMain from 'content-scripts/main';
import {testAutocryptHeaders} from '../../fixtures/headers';
import testKeys from '../../fixtures/keys';
// Import offscreen module to ensure window.offscreen is available
import 'lib/offscreen/offscreen';

// Import integration-specific mocks
import {createMockEventHandler} from '../__mocks__/lib/EventHandler';
import {createMockProvider} from '../__mocks__/content-scripts/providers';
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
    providerSpecific,
    GmailIntegration,
    csMain
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

  /**
   * Encrypt a test message using the test keyring
   * @param {string} message - The message to encrypt
   * @param {Object} options - Encryption options
   * @param {string} options.keyringId - The keyring ID to use (defaults to 'test-keyring-id')
   * @param {string} options.recipientFpr - The recipient's fingerprint (defaults to api_test key fingerprint)
   * @param {string} options.signingKeyFpr - The signing key fingerprint (optional)
   * @returns {Promise<string>} The encrypted armored message
   */
  encryptTestMessage: async (message, options = {}) => {
    try {
      const keyringId = options.keyringId || 'test-keyring-id';
      const keyring = await getById(keyringId);

      // Get the api_test key fingerprint (this is the default recipient)
      const recipientFpr = options.recipientFpr || 'add0c44ae80a572f3805729cf47328454fa3ab54';
      const signingKeyFpr = options.signingKeyFpr;

      // Create a mock unlock function for testing
      const unlockKey = async ({key}) =>
        // For testing, we'll assume the test key has no passphrase
        // In a real scenario, this would prompt for a password
        key
      ;

      // Use the openpgpjs backend to encrypt
      const backend = keyring.getPgpBackend();
      const encrypted = await backend.encrypt({
        data: message,
        keyring,
        unlockKey,
        encryptionKeyFprs: [recipientFpr],
        signingKeyFpr,
        armor: true
      });

      return encrypted;
    } catch (error) {
      console.error('testHarness.encryptTestMessage: Failed to encrypt message:', error);
      throw error;
    }
  },

};

