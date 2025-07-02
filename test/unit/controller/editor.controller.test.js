import EditorController from '../../../src/controller/editor.controller';
import {prefs} from '../../../src/modules/prefs';
import * as l10n from '../../../src/lib/l10n';
import {createMockPort} from '../__mocks__/port';

// Mock dependencies
jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/modules/prefs', () => ({
  prefs: {
    general: {
      auto_sign_msg: false,
      auto_add_primary: false
    },
    security: {
      password_cache: true
    }
  }
}));
jest.mock('../../../src/lib/lib-mvelo', () => require('../__mocks__/lib/lib-mvelo').default);

jest.mock('../../../src/modules/keyring', () => require('../__mocks__/modules/keyring').default);
jest.mock('../../../src/modules/pgpModel', () => ({}));
jest.mock('../../../src/modules/keyRegistry', () => ({}));
jest.mock('../../../src/controller/main.controller', () => ({
  createController: jest.fn()
}));
jest.mock('../../../src/modules/mime', () => ({
  parseMessage: jest.fn(),
  buildMail: jest.fn()
}));
jest.mock('../../../src/modules/uiLog', () => ({
  push: jest.fn()
}));
jest.mock('../../../src/controller/sub.controller', () => require('../__mocks__/controller/sub.controller').default);

describe('EditorController unit tests', () => {
  let controller;
  let mockPort;
  let MockEventHandler;

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    MockEventHandler = require('../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();

    mockPort = createMockPort('editor-port');

    controller = new EditorController(mockPort);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    MockEventHandler.clearMockResponses();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(controller.state).toEqual({
        popupId: null,
        popupOpenerTabId: null,
        keyringId: null,
        integration: false,
        userInfo: null
      });
      expect(controller.peerType).toBe('editorController');
      expect(controller.popup).toBeNull();
      expect(controller.signKeyFpr).toBeNull();
      expect(controller.pgpMIME).toBe(false);
      expect(controller.options).toEqual({});
    });

    it('should initialize without port for standalone mode', () => {
      const standaloneController = new EditorController();
      expect(standaloneController.mainType).toBe('editor');
      expect(standaloneController.id).toBeDefined();
    });
  });

  describe('formatMessage', () => {
    it('should return message unchanged with no options', () => {
      const message = 'Hello World';
      const result = controller.formatMessage(message, {});
      expect(result).toBe('Hello World');
    });

    it('should indent quoted mail', () => {
      const message = 'Line 1\nLine 2';
      const options = {quotedMailIndent: true};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\n> Line 1\n> Line 2');
    });

    it('should add quoted mail header', () => {
      const message = 'Original message';
      const options = {quotedMailHeader: 'On Mon, Jan 1, 2024 at 12:00 PM, sender@example.com wrote:'};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\nOn Mon, Jan 1, 2024 at 12:00 PM, sender@example.com wrote:\nOriginal message');
    });

    it('should add predefined text', () => {
      const message = 'Original message';
      const options = {predefinedText: 'Reply text'};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('Original message\n\nReply text');
    });

    it('should handle multiple formatting options', () => {
      const message = 'Original message';
      const options = {
        quotedMailIndent: true,
        quotedMailHeader: 'Header:',
        predefinedText: 'Reply text'
      };
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\nHeader:\n> Original message\n\nReply text');
    });

    it('should handle empty message', () => {
      const result = controller.formatMessage('', {quotedMailIndent: true});
      expect(result).toBe('\n\n');
    });

    it('should handle multiline indentation correctly', () => {
      const message = 'Line 1\n\nLine 3';
      const options = {quotedMailIndent: true};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\n> Line 1\n> \n> Line 3');
    });
  });

  describe('getPublicKeyFprs', () => {
    const mockKeyring = {
      getDefaultKeyFpr: jest.fn()
    };

    beforeEach(() => {
      const {getById} = require('../../../src/modules/keyring');
      getById.mockResolvedValue(mockKeyring);
      controller.state.keyringId = 'test-keyring';
    });

    it('should use keyFprBuffer when available', async () => {
      controller.keyFprBuffer = ['key1', 'key2', 'key1']; // with duplicate
      const keys = [{fingerprint: 'key3'}, {fingerprint: 'key4'}];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['key1', 'key2']); // deduplicated
    });

    it('should extract fingerprints from keys when no buffer', async () => {
      controller.keyFprBuffer = null;
      const keys = [
        {fingerprint: 'key1'},
        {fingerprint: 'key2'},
        {fingerprint: null}, // should be filtered out
        {fingerprint: 'key1'} // duplicate
      ];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['key1', 'key2']); // sorted and deduplicated
    });

    it('should add primary key when auto_add_primary is enabled', async () => {
      prefs.general.auto_add_primary = true;
      mockKeyring.getDefaultKeyFpr.mockResolvedValue('primary-key');
      controller.keyFprBuffer = null;
      const keys = [{fingerprint: 'key1'}];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['key1', 'primary-key']);
      prefs.general.auto_add_primary = false; // reset
    });

    it('should not add primary key when auto_add_primary is disabled', async () => {
      prefs.general.auto_add_primary = false;
      mockKeyring.getDefaultKeyFpr.mockResolvedValue('primary-key');
      controller.keyFprBuffer = null;
      const keys = [{fingerprint: 'key1'}];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['key1']);
    });

    it('should handle empty keys array', async () => {
      controller.keyFprBuffer = null;

      const result = await controller.getPublicKeyFprs([]);

      expect(result).toEqual([]);
    });

    it('should handle no default key available', async () => {
      prefs.general.auto_add_primary = true;
      mockKeyring.getDefaultKeyFpr.mockResolvedValue(null);
      controller.keyFprBuffer = null;
      const keys = [{fingerprint: 'key1'}];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['key1']);
      prefs.general.auto_add_primary = false; // reset
    });
  });

  describe('onEditorUserInput', () => {
    it('should log user input to uiLog', () => {
      const {push} = require('../../../src/modules/uiLog');
      const msg = {
        source: 'security_log_editor',
        type: 'password_dialog_ok'
      };

      controller.onEditorUserInput(msg);

      expect(push).toHaveBeenCalledWith('security_log_editor', 'password_dialog_ok');
    });
  });

  describe('onSignOnly', () => {
    beforeEach(() => {
      controller.ports = {
        editor: {
          emit: jest.fn()
        }
      };
    });

    it('should set sign key fingerprint and request plaintext', () => {
      const msg = {signKeyFpr: 'test-fingerprint'};

      controller.onSignOnly(msg);

      expect(controller.signKeyFpr).toBe('test-fingerprint');
      expect(controller.ports.editor.emit).toHaveBeenCalledWith('get-plaintext', {action: 'sign'});
    });
  });

  describe('setState', () => {
    it('should update state properties', () => {
      const newState = {
        keyringId: 'new-keyring',
        integration: true
      };

      controller.setState(newState);

      expect(controller.state.keyringId).toBe('new-keyring');
      expect(controller.state.integration).toBe(true);
      expect(controller.state.popupId).toBeNull(); // unchanged
    });

    it('should not overwrite existing state properties', () => {
      controller.state.popupId = 'existing-popup';

      controller.setState({keyringId: 'new-keyring'});

      expect(controller.state.popupId).toBe('existing-popup');
      expect(controller.state.keyringId).toBe('new-keyring');
    });
  });

  describe('error handling', () => {
    it('should handle invalid port states gracefully', () => {
      controller.ports = {
        editor: null
      };

      // These should throw errors since we're accessing null.emit
      expect(() => controller.beforeAuthorization()).toThrow();
      expect(() => controller.afterAuthorization()).toThrow();
    });

    it('should handle missing dependencies gracefully', async () => {
      // Reset keyFprBuffer to force the method to use the keyring path
      controller.keyFprBuffer = null;
      prefs.general.auto_add_primary = true; // Enable auto_add_primary to trigger keyring call
      const keys = [{fingerprint: 'test'}];
      const {getById} = require('../../../src/modules/keyring');
      getById.mockRejectedValue(new Error('Keyring not found'));

      await expect(controller.getPublicKeyFprs(keys)).rejects.toThrow('Keyring not found');
      prefs.general.auto_add_primary = false; // reset
    });
  });

  describe('key fingerprint handling', () => {
    it('should handle mixed case fingerprints consistently', async () => {
      const mockKeyring = {getDefaultKeyFpr: jest.fn()};
      const {getById} = require('../../../src/modules/keyring');
      getById.mockResolvedValue(mockKeyring);
      controller.keyFprBuffer = ['AbC123', 'def456', 'ABC123']; // mixed case with duplicate

      const result = await controller.getPublicKeyFprs([]);

      // The actual sorting sorts alphabetically and removes duplicates
      expect(result).toEqual(['ABC123', 'AbC123', 'def456']);
    });

    it('should filter out empty fingerprints', async () => {
      const mockKeyring = {getDefaultKeyFpr: jest.fn()};
      const {getById} = require('../../../src/modules/keyring');
      getById.mockResolvedValue(mockKeyring);
      controller.keyFprBuffer = null;
      const keys = [
        {fingerprint: 'valid-key'},
        {fingerprint: ''},
        {fingerprint: null},
        {fingerprint: undefined},
        {fingerprint: 'another-valid-key'}
      ];

      const result = await controller.getPublicKeyFprs(keys);

      expect(result).toEqual(['another-valid-key', 'valid-key']); // sorted, filtered
    });
  });

  describe('message formatting edge cases', () => {
    it('should handle special characters in quoted mail', () => {
      const message = 'Hello > World\n< Goodbye';
      const options = {quotedMailIndent: true};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\n> Hello > World\n> < Goodbye');
    });

    it('should handle Unicode characters', () => {
      const message = 'Hello 🌍\nGoodbye 👋';
      const options = {quotedMailIndent: true, predefinedText: 'Reply 📝'};
      const result = controller.formatMessage(message, options);
      expect(result).toBe('\n\n> Hello 🌍\n> Goodbye 👋\n\nReply 📝');
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(1000);
      const message = `Short line\n${longLine}\nAnother short line`;
      const options = {quotedMailIndent: true};
      const result = controller.formatMessage(message, options);
      expect(result).toBe(`\n\n> Short line\n> ${longLine}\n> Another short line`);
    });
  });
});
