/**
 * Copyright (C) 2026 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

// Mock dependencies - must be before imports
jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/lib/lib-mvelo', () => require('../__mocks__/lib/lib-mvelo').default);
jest.mock('../../../src/lib/util', () => require('../__mocks__/lib/util').default);
jest.mock('../../../src/lib/email', () => ({parseAddress: jest.fn()}));
jest.mock('../../../src/lib/file', () => ({
  extractFileExtension: jest.fn(fileName => fileName.split('.').pop())
}));
jest.mock('../../../src/lib/constants', () => ({
  DISPLAY_INLINE: 'inline',
  ERROR_OUTLOOK_AUTH_CANCELLED: 'OUTLOOK_AUTH_CANCELLED'
}));
jest.mock('../../../src/modules/prefs', () => ({
  prefs: {
    security: {
      display_decrypted: 'inline',
      password_cache: true
    }
  }
}));
jest.mock('../../../src/modules/keyring', () => require('../__mocks__/modules/keyring').default);
jest.mock('../../../src/modules/pgpModel', () => ({
  readMessage: jest.fn(),
  decryptMessage: jest.fn(),
  noKeyFoundError: jest.fn()
}));
jest.mock('../../../src/modules/mime', () => ({parseMessage: jest.fn()}));
jest.mock('../../../src/modules/pwdCache', () => ({isCached: jest.fn()}));
jest.mock('../../../src/modules/uiLog', () => ({push: jest.fn()}));
jest.mock('../../../src/modules/outlook');
jest.mock('../../../src/controller/main.controller', () => ({
  createController: jest.fn(),
  controllerPool: {get: jest.fn()}
}));
jest.mock('../../../src/controller/sub.controller', () => require('../__mocks__/controller/sub.controller').default);
jest.mock('../../../src/controller/sync.controller', () => ({triggerSync: jest.fn()}));
jest.mock('../../../src/controller/import.controller', () => ({lookupKey: jest.fn()}));

import OutlookDecryptController from '../../../src/controller/outlookDecrypt.controller';
import * as l10n from '../../../src/lib/l10n';
import {createMockPort} from '../__mocks__/port';

describe('OutlookDecryptController unit tests', () => {
  let controller;

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPort = createMockPort('dFrameOutlook-123');
    controller = new OutlookDecryptController(mockPort);
    controller.ports = {
      dDialog: {emit: jest.fn()},
      aFrameOutlook: {emit: jest.fn()}
    };
    controller.keyringId = 'test-keyring-id';
  });

  describe('processData', () => {
    beforeEach(() => {
      controller.armored = '-----BEGIN PGP MESSAGE-----';
      controller.attachments = ['encrypted.asc'];
      controller.message = {getEncryptionKeyIDs: jest.fn(() => ['key-id-1'])};
      controller.getAccessToken = jest.fn().mockResolvedValue('test-token');
      controller.onAttachments = jest.fn();
      controller.canUnlockKey = jest.fn().mockResolvedValue(true);
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const {parseMessage} = require('../../../src/modules/mime');
      decryptMessage.mockResolvedValue({data: 'decrypted-data', signatures: []});
      parseMessage.mockResolvedValue({message: 'decrypted message', attachments: []});
    });

    it('should establish authorization before the password interaction', async () => {
      const order = [];
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      controller.getAccessToken.mockImplementation(() => {
        order.push('authorization');
        return Promise.resolve('test-token');
      });
      decryptMessage.mockImplementation(() => {
        order.push('decrypt');
        return Promise.resolve({data: 'decrypted-data', signatures: []});
      });

      await controller.processData();

      expect(order).toEqual(['authorization', 'decrypt']);
      expect(controller.onAttachments).toHaveBeenCalledWith('test-token');
    });

    it('should lock the frame instead of opening the password dialog right after a sign-in in the settings tab', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      controller.getAccessToken.mockImplementation(({afterAuth}) => {
        afterAuth();
        return Promise.resolve('test-token');
      });
      controller.canUnlockKey.mockResolvedValue(false);

      await controller.processData();

      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('lock');
      expect(decryptMessage).not.toHaveBeenCalled();
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });

    describe('with the authorization modes reported by the Outlook controller', () => {
      let reportedModes;

      beforeEach(() => {
        reportedModes = [];
        controller.getAccessToken = OutlookDecryptController.prototype.getAccessToken;
        controller.afterAuthorization = jest.fn();
        controller.outlookCtrl = {
          getAccessToken: jest.fn(({beforeAuth, afterAuth}) => {
            for (const reauth of reportedModes) {
              beforeAuth({reauth});
            }
            afterAuth();
            return Promise.resolve('test-token');
          })
        };
        controller.canUnlockKey.mockResolvedValue(false);
      });

      it('should open the password dialog right after a silent renewal', async () => {
        const {decryptMessage} = require('../../../src/modules/pgpModel');
        reportedModes = [true];

        await controller.processData();

        expect(controller.ports.dDialog.emit).not.toHaveBeenCalledWith('lock');
        expect(decryptMessage).toHaveBeenCalled();
        expect(controller.onAttachments).toHaveBeenCalledWith('test-token');
      });

      it('should lock the frame when a failed silent renewal fell back to the settings tab', async () => {
        const {decryptMessage} = require('../../../src/modules/pgpModel');
        reportedModes = [true, false];

        await controller.processData();

        expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('lock');
        expect(decryptMessage).not.toHaveBeenCalled();
      });
    });

    it('should continue automatically after a fresh authorization when the key is cached', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      controller.getAccessToken.mockImplementation(({afterAuth}) => {
        afterAuth();
        return Promise.resolve('test-token');
      });

      await controller.processData();

      expect(decryptMessage).toHaveBeenCalled();
      expect(controller.onAttachments).toHaveBeenCalledWith('test-token');
      expect(controller.ports.dDialog.emit).not.toHaveBeenCalledWith('lock');
    });

    it('should fall back to the message body when the authorization is declined', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Authorization cancelled by user.');
      error.code = 'OUTLOOK_AUTH_CANCELLED';
      controller.getAccessToken.mockRejectedValue(error);

      await controller.processData();

      expect(decryptMessage).toHaveBeenCalled();
      expect(controller.onAttachments).not.toHaveBeenCalled();
      expect(controller.ports.dDialog.emit).not.toHaveBeenCalledWith('error-message', expect.anything());
    });

    it('should show the error after the body decrypt on other authorization failures', async () => {
      const order = [];
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Admin consent required');
      error.code = 'OUTLOOK_OAUTH_ADMIN_CONSENT';
      controller.getAccessToken.mockRejectedValue(error);
      decryptMessage.mockImplementation(() => {
        order.push('decrypt');
        return Promise.resolve({data: 'decrypted-data', signatures: []});
      });
      controller.ports.dDialog.emit.mockImplementation(event => {
        if (event === 'error-message') {
          order.push('error');
        }
      });

      await controller.processData();

      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {error: 'Admin consent required'});
      expect(order).toEqual(['decrypt', 'error']);
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });

    it('should report a declined authorization when there is no message body', async () => {
      controller.armored = null;
      const error = new Error('Authorization cancelled by user.');
      error.code = 'OUTLOOK_AUTH_CANCELLED';
      controller.getAccessToken.mockRejectedValue(error);

      await controller.processData();

      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {error: 'Authorization cancelled by user.'});
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });

    it('should continue with the attachments when the key check fails after a fresh authorization', async () => {
      controller.getAccessToken.mockImplementation(({afterAuth}) => {
        afterAuth();
        return Promise.resolve('test-token');
      });
      controller.canUnlockKey.mockResolvedValue(undefined);

      await controller.processData();

      expect(controller.ports.dDialog.emit).not.toHaveBeenCalledWith('lock');
      expect(controller.onAttachments).toHaveBeenCalledWith('test-token');
    });

    it('should ignore a second decrypt request while one is in flight', async () => {
      const {promise, resolve} = Promise.withResolvers();
      controller.getAccessToken.mockReturnValue(promise);

      const first = controller.processData();
      await controller.processData();

      expect(controller.getAccessToken).toHaveBeenCalledTimes(1);
      resolve('test-token');
      await first;
      expect(controller.onAttachments).toHaveBeenCalledTimes(1);
    });

    it('should not download attachments when the password dialog is cancelled', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Password dialog cancelled');
      error.code = 'PWD_DIALOG_CANCEL';
      decryptMessage.mockRejectedValue(error);

      await controller.processData();

      expect(controller.ports.aFrameOutlook.emit).toHaveBeenCalledWith('dialog-cancel');
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('lock');
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });
  });
});
