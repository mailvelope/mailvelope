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
  DISPLAY_INLINE: 'inline'
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
jest.mock('../../../src/modules/gmail');
jest.mock('../../../src/controller/main.controller', () => ({
  createController: jest.fn(),
  controllerPool: {get: jest.fn()}
}));
jest.mock('../../../src/controller/sub.controller', () => require('../__mocks__/controller/sub.controller').default);
jest.mock('../../../src/controller/sync.controller', () => ({triggerSync: jest.fn()}));
jest.mock('../../../src/controller/import.controller', () => ({lookupKey: jest.fn()}));

import GmailDecryptController from '../../../src/controller/gmailDecrypt.controller';
import * as l10n from '../../../src/lib/l10n';
import {createMockPort} from '../__mocks__/port';

describe('GmailDecryptController unit tests', () => {
  let controller;

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPort = createMockPort('dFrameGmail-123');
    controller = new GmailDecryptController(mockPort);
    controller.ports = {
      dDialog: {emit: jest.fn()},
      aFrameGmail: {emit: jest.fn()}
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

    it('should decrypt the message body before requesting authorization', async () => {
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

      expect(order).toEqual(['decrypt', 'authorization']);
      expect(controller.onAttachments).toHaveBeenCalledWith('test-token');
    });

    it('should show the error after the body decrypt when the authorization fails', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Authorization cancelled by user.');
      error.code = 'GMAIL_AUTH_CANCELLED';
      controller.getAccessToken.mockRejectedValue(error);

      await controller.processData();

      expect(decryptMessage).toHaveBeenCalled();
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {error: 'Authorization cancelled by user.'});
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });

    it('should not download attachments when the password dialog is cancelled', async () => {
      const {decryptMessage} = require('../../../src/modules/pgpModel');
      const error = new Error('Password dialog cancelled');
      error.code = 'PWD_DIALOG_CANCEL';
      decryptMessage.mockRejectedValue(error);

      await controller.processData();

      expect(controller.ports.aFrameGmail.emit).toHaveBeenCalledWith('dialog-cancel');
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('lock');
      expect(controller.getAccessToken).not.toHaveBeenCalled();
      expect(controller.onAttachments).not.toHaveBeenCalled();
    });

    it('should not fetch a clipped message when the authorization fails', async () => {
      controller.armored = null;
      controller.attachments = [];
      controller.clipped = true;
      controller.onClippedArmored = jest.fn();
      const error = new Error('Authorization cancelled by user.');
      error.code = 'GMAIL_AUTH_CANCELLED';
      controller.getAccessToken.mockRejectedValue(error);

      await controller.processData();

      expect(controller.onClippedArmored).not.toHaveBeenCalled();
      expect(controller.ports.dDialog.emit).toHaveBeenCalledWith('error-message', {error: 'Authorization cancelled by user.'});
    });
  });
});
