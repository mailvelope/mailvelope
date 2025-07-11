import DecryptController from '../../../src/controller/decrypt.controller';
import * as l10n from '../../../src/lib/l10n';
import {createMockPort} from '../__mocks__/port';

// Mock dependencies
jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/modules/prefs', () => ({
  prefs: {
    security: {
      display_decrypted: 'inline',
      password_cache: true
    }
  }
}));
jest.mock('../../../src/lib/lib-mvelo', () => require('../__mocks__/lib/lib-mvelo').default);
jest.mock('../../../src/modules/keyring', () => require('../__mocks__/modules/keyring').default);
jest.mock('../../../src/modules/pgpModel', () => ({
  readMessage: jest.fn(),
  decryptMessage: jest.fn(),
  noKeyFoundError: jest.fn()
}));
jest.mock('../../../src/modules/mime', () => ({
  parseMessage: jest.fn()
}));
jest.mock('../../../src/modules/pwdCache', () => ({
  isCached: jest.fn()
}));
jest.mock('../../../src/controller/main.controller', () => ({
  createController: jest.fn()
}));
jest.mock('../../../src/controller/sub.controller', () => require('../__mocks__/controller/sub.controller').default);
jest.mock('../../../src/lib/util', () => require('../__mocks__/lib/util').default);
jest.mock('../../../src/lib/constants', () => ({
  DISPLAY_INLINE: 'inline'
}));
jest.mock('../../../src/modules/uiLog', () => ({
  push: jest.fn()
}));
jest.mock('../../../src/controller/sync.controller', () => ({
  triggerSync: jest.fn()
}));
jest.mock('../../../src/controller/import.controller', () => ({
  lookupKey: jest.fn()
}));

describe('DecryptController unit tests', () => {
  let controller;
  let mockPort;
  let mockKeyring;
  let mockKey;
  let mockMessage;

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock keyring
    mockKeyring = {
      getPrivateKeyByIds: jest.fn(),
      keyringId: 'test-keyring-id'
    };

    // Setup mock key
    mockKey = {
      getFingerprint: jest.fn(() => 'test-fingerprint')
    };

    // Setup mock message
    mockMessage = {
      getEncryptionKeyIDs: jest.fn(() => ['key-id-1', 'key-id-2'])
    };

    // Setup port
    mockPort = createMockPort('decrypt-port');

    // Create controller
    controller = new DecryptController(mockPort);

    // Setup common mocks
    const {getKeyringWithPrivKey, getPreferredKeyringId} = require('../../../src/modules/keyring');
    getKeyringWithPrivKey.mockResolvedValue(mockKeyring);
    getPreferredKeyringId.mockResolvedValue('test-keyring-id');

    const {readMessage} = require('../../../src/modules/pgpModel');
    readMessage.mockResolvedValue(mockMessage);

    mockKeyring.getPrivateKeyByIds.mockReturnValue(mockKey);
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(controller.state).toEqual({
        popupId: null,
        popupOpenerTabId: null
      });
      expect(controller.armored).toBeNull();
      expect(controller.message).toBeNull();
      expect(controller.sender).toBeNull();
      expect(controller.popup).toBeNull();
      expect(controller.reconnect).toBe(false);
    });

    it('should initialize without port for standalone mode', () => {
      const standaloneController = new DecryptController();
      expect(standaloneController.mainType).toBe('decryptCont');
      expect(standaloneController.id).toBeDefined();
    });

    it('should register event handlers correctly', () => {
      const handlers = Array.from(controller._handlers.keys());
      expect(handlers).toContain('decrypt-dialog-cancel');
      expect(handlers).toContain('decrypt-message-init');
      expect(handlers).toContain('decrypt-message');
      expect(handlers).toContain('dframe-display-popup');
      expect(handlers).toContain('set-armored');
      expect(handlers).toContain('decrypt-inline-user-input');
    });
  });

  describe('canUnlockKey', () => {
    beforeEach(() => {
      controller.ports = {
        dDialog: {
          emit: jest.fn()
        }
      };
    });

    it('should return true when key is cached', async () => {
      const {isCached} = require('../../../src/modules/pwdCache');
      isCached.mockResolvedValue(true);

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBe(true);
      expect(controller.message).toBe(mockMessage);
    });

    it('should return false when key is not cached', async () => {
      const {isCached} = require('../../../src/modules/pwdCache');
      isCached.mockResolvedValue(false);

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBe(false);
      expect(controller.message).toBe(mockMessage);
    });

    it('should handle message reading errors', async () => {
      const {readMessage} = require('../../../src/modules/pgpModel');
      readMessage.mockRejectedValue(new Error('Invalid armored message'));

      const result = await controller.canUnlockKey('invalid-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {
        error: 'Invalid armored message'
      });
    });

    it('should handle keyring not found error', async () => {
      const {getKeyringWithPrivKey} = require('../../../src/modules/keyring');
      getKeyringWithPrivKey.mockResolvedValue(null);

      const {noKeyFoundError} = require('../../../src/modules/pgpModel');
      noKeyFoundError.mockReturnValue(new Error('No key found'));

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {
        error: 'No key found'
      });
    });

    it('should handle missing dDialog port gracefully', async () => {
      controller.ports = {};
      const {readMessage} = require('../../../src/modules/pgpModel');
      readMessage.mockRejectedValue(new Error('Test error'));

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
      // Should not throw error when dDialog port is missing
    });

    it('should set message property after successful reading', async () => {
      const {isCached} = require('../../../src/modules/pwdCache');
      isCached.mockResolvedValue(true);

      await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(controller.message).toBe(mockMessage);
    });

    it('should call getEncryptionKeyIDs on message', async () => {
      const {isCached} = require('../../../src/modules/pwdCache');
      isCached.mockResolvedValue(true);

      await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(mockMessage.getEncryptionKeyIDs).toHaveBeenCalled();
    });
  });

  describe('getPopup', () => {
    beforeEach(() => {
      controller.setState({
        popupId: null,
        popupOpenerTabId: null
      });
      controller.popup = null;
    });

    it('should return existing popup if available', async () => {
      const existingPopup = {id: 'popup-1', addRemoveListener: jest.fn()};
      controller.popup = existingPopup;

      const result = await controller.getPopup();

      expect(result).toBe(existingPopup);
    });

    it('should retrieve popup by ID when state has popupId', async () => {
      const mvelo = require('../../../src/lib/lib-mvelo');
      const mockPopup = {
        id: 'popup-1',
        addRemoveListener: jest.fn()
      };
      mvelo.windows.getPopup.mockResolvedValue(mockPopup);

      controller.setState({
        popupId: 'popup-1',
        popupOpenerTabId: 'tab-1'
      });

      const result = await controller.getPopup();

      expect(result).toBe(mockPopup);
      expect(controller.popup).toBe(mockPopup);
      expect(mvelo.windows.getPopup).toHaveBeenCalledWith('popup-1', 'tab-1');
      expect(mockPopup.addRemoveListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle popup retrieval errors and reset state', async () => {
      const mvelo = require('../../../src/lib/lib-mvelo');
      mvelo.windows.getPopup.mockRejectedValue(new Error('Popup not found'));

      controller.setState({
        popupId: 'popup-1',
        popupOpenerTabId: 'tab-1'
      });

      const result = await controller.getPopup();

      expect(result).toBeUndefined();
      expect(controller.state.popupId).toBeNull();
      expect(controller.state.popupOpenerTabId).toBeNull();
    });

    it('should return undefined when no popup exists and no state', async () => {
      const result = await controller.getPopup();

      expect(result).toBeUndefined();
    });

    it('should set up dialog cancel listener on retrieved popup', async () => {
      const mvelo = require('../../../src/lib/lib-mvelo');
      const mockPopup = {
        id: 'popup-1',
        addRemoveListener: jest.fn()
      };
      mvelo.windows.getPopup.mockResolvedValue(mockPopup);

      controller.setState({
        popupId: 'popup-1',
        popupOpenerTabId: 'tab-1'
      });

      await controller.getPopup();

      expect(mockPopup.addRemoveListener).toHaveBeenCalledWith(expect.any(Function));

      // Test that the callback is dialogCancel
      const callback = mockPopup.addRemoveListener.mock.calls[0][0];
      controller.dialogCancel = jest.fn();
      callback();
      expect(controller.dialogCancel).toHaveBeenCalled();
    });
  });

  describe('error mapping logic', () => {
    beforeEach(() => {
      controller.ports = {
        dDialog: {
          emit: jest.fn()
        },
        decryptCont: {
          emit: jest.fn()
        }
      };
    });

    it('should map ARMOR_PARSE_ERROR correctly', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Armor parse failed');
      error.code = 'ARMOR_PARSE_ERROR';
      decryptMessage.mockRejectedValue(error);

      const {mapError} = require('../../../src/lib/util');
      const mappedError = {code: 'ARMOR_PARSE_ERROR', message: 'Mapped error'};
      mapError.mockReturnValue(mappedError);

      controller.message = mockMessage;
      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.ports.decryptCont.emit).toHaveBeenCalledWith('error-message', {
        error: mappedError
      });
    });

    it('should map PWD_DIALOG_CANCEL correctly', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Password dialog cancelled');
      error.code = 'PWD_DIALOG_CANCEL';
      decryptMessage.mockRejectedValue(error);

      const {mapError} = require('../../../src/lib/util');
      const mappedError = {code: 'PWD_DIALOG_CANCEL', message: 'Cancelled'};
      mapError.mockReturnValue(mappedError);

      controller.message = mockMessage;
      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.ports.decryptCont.emit).toHaveBeenCalledWith('error-message', {
        error: mappedError
      });
    });

    it('should map NO_KEY_FOUND correctly', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('No key found');
      error.code = 'NO_KEY_FOUND';
      decryptMessage.mockRejectedValue(error);

      const {mapError} = require('../../../src/lib/util');
      const mappedError = {code: 'NO_KEY_FOUND', message: 'No key found'};
      mapError.mockReturnValue(mappedError);

      controller.message = mockMessage;
      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.ports.decryptCont.emit).toHaveBeenCalledWith('error-message', {
        error: mappedError
      });
    });

    it('should map unknown errors to generic DECRYPT_ERROR', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN_ERROR';
      decryptMessage.mockRejectedValue(error);

      controller.message = mockMessage;
      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.ports.decryptCont.emit).toHaveBeenCalledWith('error-message', {
        error: {
          code: 'DECRYPT_ERROR',
          message: 'Generic decrypt error'
        }
      });
    });

    it('should handle PWD_DIALOG_CANCEL with Frame port', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Password dialog cancelled');
      error.code = 'PWD_DIALOG_CANCEL';
      decryptMessage.mockRejectedValue(error);

      controller.hasPort = jest.fn(() => true);
      controller.dialogCancel = jest.fn();
      controller.message = mockMessage;

      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.dialogCancel).toHaveBeenCalled();
    });

    it('should not expose internal errors to API', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Internal system error with sensitive details');
      error.code = 'INTERNAL_ERROR';
      decryptMessage.mockRejectedValue(error);

      controller.message = mockMessage;
      await controller.decrypt('test-armored', 'test-keyring-id');

      expect(controller.ports.decryptCont.emit).toHaveBeenCalledWith('error-message', {
        error: {
          code: 'DECRYPT_ERROR',
          message: 'Generic decrypt error'
        }
      });
    });
  });

  describe('state management', () => {
    it('should update state correctly', () => {
      const newState = {
        popupId: 'new-popup-id',
        popupOpenerTabId: 'new-tab-id'
      };

      controller.setState(newState);

      expect(controller.state.popupId).toBe('new-popup-id');
      expect(controller.state.popupOpenerTabId).toBe('new-tab-id');
    });

    it('should preserve existing state when updating', () => {
      controller.setState({popupId: 'existing-popup'});
      controller.setState({popupOpenerTabId: 'new-tab'});

      expect(controller.state.popupId).toBe('existing-popup');
      expect(controller.state.popupOpenerTabId).toBe('new-tab');
    });

    it('should handle state reset correctly', () => {
      controller.setState({
        popupId: 'popup-1',
        popupOpenerTabId: 'tab-1'
      });

      controller.setState({
        popupId: null,
        popupOpenerTabId: null
      });

      expect(controller.state.popupId).toBeNull();
      expect(controller.state.popupOpenerTabId).toBeNull();
    });

    it('should maintain armored and message state independently', () => {
      controller.armored = 'test-armored';
      controller.message = mockMessage;
      controller.sender = 'test@example.com';

      controller.setState({popupId: 'popup-1'});

      expect(controller.armored).toBe('test-armored');
      expect(controller.message).toBe(mockMessage);
      expect(controller.sender).toBe('test@example.com');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing ports gracefully', async () => {
      controller.ports = {};

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBe(true); // Should still work, just no error emission
    });

    it('should handle null keyring gracefully', async () => {
      const {getKeyringWithPrivKey} = require('../../../src/modules/keyring');
      getKeyringWithPrivKey.mockResolvedValue(null);

      controller.ports = {
        dDialog: {
          emit: jest.fn()
        }
      };

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
    });

    it('should handle key fingerprint retrieval errors', async () => {
      mockKey.getFingerprint.mockImplementation(() => {
        throw new Error('Fingerprint error');
      });

      const {isCached} = require('../../../src/modules/pwdCache');
      isCached.mockRejectedValue(new Error('Fingerprint error'));

      controller.ports = {
        dDialog: {
          emit: jest.fn()
        }
      };

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
    });

    it('should handle empty encryption key IDs', async () => {
      mockMessage.getEncryptionKeyIDs.mockReturnValue([]);

      controller.ports = {
        dDialog: {
          emit: jest.fn()
        }
      };

      const result = await controller.canUnlockKey('test-armored', 'test-keyring-id');

      expect(result).toBeUndefined();
    });
  });
});
