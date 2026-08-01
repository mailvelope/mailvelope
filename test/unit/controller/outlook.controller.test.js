/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

// Mock dependencies - must be before imports
jest.mock('../../../src/modules/mime', () => ({
  parseSignedMessage: jest.fn(() => ({signedMessage: '', message: '', attachments: []})),
  buildMailWithHeader: jest.fn(({message, subject, sender, to}) =>
    `Content-Type: multipart/mixed\r\nFrom: ${sender}\r\nTo: ${to?.join(', ')}\r\nSubject: ${subject}\r\n\r\n${message}`
  )
}));
jest.mock('../../../src/modules/closure-library/closure/goog/emailaddress', () => ({
  goog: {
    format: {
      EmailAddress: {
        parse: jest.fn(address => ({
          isValid: () => true,
          getAddress: () => address.match(/<(.+)>/)?.[1] || address,
          getName: () => address.match(/"?(.+?)"?\s*</)?.[1] || ''
        }))
      }
    }
  }
}));
jest.mock('../../../src/lib/EventHandler', () => require('../__mocks__/lib/EventHandler').default);
jest.mock('../../../src/lib/lib-mvelo');
jest.mock('../../../src/modules/outlook');

import OutlookController from '../../../src/controller/outlook.controller';
import {createMockPort} from '../__mocks__/port';
jest.mock('../../../src/controller/sub.controller', () => {
  const mockSubController = require('../__mocks__/controller/sub.controller').default;
  return {
    SubController: mockSubController.SubController,
    setAppDataSlot: jest.fn()
  };
});

describe('OutlookController', () => {
  let controller;
  let mockPort;
  let mockOutlook;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get outlook module mock
    mockOutlook = require('../../../src/modules/outlook');
    mockOutlook.getAccessToken = jest.fn();
    mockOutlook.authorize = jest.fn();
    mockOutlook.OUTLOOK_SCOPE_MAIL_READ = 'https://graph.microsoft.com/Mail.Read';
    mockOutlook.OUTLOOK_SCOPE_MAIL_SEND = 'https://graph.microsoft.com/Mail.Send';

    // Create controller
    mockPort = createMockPort('outlookController-123');
    controller = new OutlookController(mockPort);
  });

  describe('constructor', () => {
    it('should initialize with correct state', () => {
      expect(controller.state).toEqual({
        userInfo: null,
        messageId: null
      });
      expect(controller.peerType).toBe('outlookController');
    });

    it('should have event handlers defined', () => {
      expect(controller.onOpenEditor).toBeDefined();
      expect(controller.onSecureBtn).toBeDefined();
    });
  });

  describe('onOpenEditor()', () => {
    it('should set state and create editor peer', async () => {
      const options = {
        text: 'Test message',
        subject: 'Test Subject',
        recipientsTo: ['test@example.com'],
        recipientsCc: [],
        userInfo: {email: 'user@outlook.com'},
        messageId: 'msg-123'
      };

      mockOutlook.getAccessToken.mockResolvedValue('valid-token');
      controller.createPeer = jest.fn().mockResolvedValue(undefined);
      controller.peers = {
        editorController: {
          getPopup: jest.fn().mockResolvedValue(false),
          openEditor: jest.fn()
        }
      };

      await controller.onOpenEditor(options);

      expect(controller.createPeer).toHaveBeenCalledWith('editorController');
      expect(controller.state.userInfo).toEqual(options.userInfo);
      expect(controller.state.messageId).toBe('msg-123');
      expect(controller.peers.editorController.openEditor).toHaveBeenCalledWith(expect.objectContaining({provider: 'outlookController'}));
    });

    it('should activate existing editor if popup already exists', async () => {
      const options = {
        userInfo: {email: 'user@outlook.com'}
      };

      mockOutlook.getAccessToken.mockResolvedValue('valid-token');
      controller.createPeer = jest.fn().mockResolvedValue(undefined);
      controller.peers = {
        editorController: {
          getPopup: jest.fn().mockResolvedValue(true),
          activateComponent: jest.fn()
        }
      };

      await controller.onOpenEditor(options);

      expect(controller.peers.editorController.activateComponent).toHaveBeenCalled();
    });

    it('should defer opening the editor until authorization completes', async () => {
      const options = {userInfo: {email: 'user@outlook.com'}};

      mockOutlook.getAccessToken.mockResolvedValue(undefined);
      mockOutlook.authorize.mockResolvedValue('fresh-token');
      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);
      controller.createPeer = jest.fn().mockResolvedValue(undefined);
      controller.peers = {
        editorController: {
          getPopup: jest.fn().mockResolvedValue(false),
          openEditor: jest.fn()
        }
      };

      const openEditorPromise = controller.onOpenEditor(options);
      await Promise.resolve();

      // editor must not open while the authorization is pending
      expect(controller.createPeer).not.toHaveBeenCalled();
      expect(controller.authorizationRequests).toHaveLength(1);

      await controller.onAuthorize({email: 'user@outlook.com', scopes: []});
      await openEditorPromise;

      expect(controller.peers.editorController.openEditor).toHaveBeenCalled();
    });

    it('should not open the editor when the authorization is cancelled', async () => {
      const options = {userInfo: {email: 'user@outlook.com'}};

      mockOutlook.getAccessToken.mockResolvedValue(undefined);
      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);
      controller.createPeer = jest.fn().mockResolvedValue(undefined);

      const openEditorPromise = controller.onOpenEditor(options);
      await Promise.resolve();

      controller.cancelAuthorization();
      await openEditorPromise;

      expect(controller.createPeer).not.toHaveBeenCalled();
    });
  });

  describe('encryptedMessage()', () => {
    it('should show the error in the editor when the mail exceeds the quota', async () => {
      const emit = jest.fn();
      controller.peers.editorController = {ports: {editor: {emit}}, getAccessToken: jest.fn()};
      controller.removePeer = jest.fn();
      controller.setState({userInfo: {email: 'test@outlook.com'}});
      mockOutlook.buildMail = jest.fn(() => {
        throw Object.assign(new Error('Mail content exceeds quota limit.'), {code: 'ENCRYPT_QUOTA_SIZE'});
      });

      await controller.encryptedMessage({armored: 'armored', encFiles: [], subject: 'Subject', to: [], cc: []});

      expect(emit).toHaveBeenCalledWith('error-message', {
        error: expect.objectContaining({code: 'ENCRYPT_QUOTA_SIZE', autoHide: false, dismissable: true})
      });
      expect(mockOutlook.sendMessage).not.toHaveBeenCalled();
      expect(controller.removePeer).toHaveBeenCalledWith('editorController');
    });
  });

  describe('getAccessToken()', () => {
    it('should return token if already authorized', async () => {
      const userInfo = {email: 'test@outlook.com'};
      mockOutlook.getAccessToken.mockResolvedValue('existing-token-123');

      const token = await controller.getAccessToken({email: userInfo.email});

      expect(token).toBe('existing-token-123');
      expect(mockOutlook.getAccessToken).toHaveBeenCalledWith({
        email: 'test@outlook.com',
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Mail.Send'
        ]
      });
    });

    it('should trigger authorization dialog if no token', async () => {
      const userInfo = {email: 'test@outlook.com'};
      mockOutlook.getAccessToken.mockResolvedValue(undefined);

      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);

      const tokenPromise = controller.getAccessToken({email: userInfo.email});

      // Wait for async operations to complete
      await Promise.resolve();

      expect(controller.openAuthorizeDialog).toHaveBeenCalledWith({
        email: 'test@outlook.com',
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Mail.Send'
        ]
      });

      // Simulate successful authorization
      expect(controller.authorizationRequests).toHaveLength(1);
      controller.authorizationRequests[0].resolve('new-token-456');

      const token = await tokenPromise;
      expect(token).toBe('new-token-456');
    });

    it('should serve concurrent requests with a single authorization dialog', async () => {
      mockOutlook.getAccessToken.mockResolvedValue(undefined);
      mockOutlook.authorize.mockResolvedValue('shared-token');

      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);

      const first = controller.getAccessToken({email: 'test@outlook.com'});
      const second = controller.getAccessToken({email: 'test@outlook.com'});
      await Promise.resolve();

      expect(controller.openAuthorizeDialog).toHaveBeenCalledTimes(1);
      expect(controller.authorizationRequests).toHaveLength(2);

      await controller.onAuthorize({email: 'test@outlook.com', scopes: []});

      await expect(first).resolves.toBe('shared-token');
      await expect(second).resolves.toBe('shared-token');
      expect(controller.authorizationRequests).toHaveLength(0);
    });

    it('should call beforeAuth callback before authorization', async () => {
      mockOutlook.getAccessToken.mockResolvedValue(undefined);
      const beforeAuth = jest.fn();

      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);

      controller.getAccessToken({email: 'test@outlook.com', beforeAuth});

      // Wait for async operations to complete
      await Promise.resolve();

      expect(beforeAuth).toHaveBeenCalled();
    });

    it('should call afterAuth callback after successful authorization', async () => {
      mockOutlook.getAccessToken.mockResolvedValue(undefined);
      mockOutlook.authorize.mockResolvedValue('new-token');
      const afterAuth = jest.fn();

      controller.openAuthorizeDialog = jest.fn().mockResolvedValue(undefined);
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);

      const tokenPromise = controller.getAccessToken({email: 'test@outlook.com', afterAuth});

      // Wait for async operations to complete
      await Promise.resolve();

      // Simulate successful authorization via onAuthorize (which actually calls afterAuth)
      await controller.onAuthorize({email: 'test@outlook.com', scopes: []});

      await tokenPromise;

      expect(afterAuth).toHaveBeenCalled();
    });
  });

  describe('onAuthorize()', () => {
    it('should authorize and resolve pending authorization request', async () => {
      const email = 'test@outlook.com';
      const scopes = ['https://graph.microsoft.com/Mail.Read'];
      mockOutlook.authorize.mockResolvedValue('new-access-token');

      const authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.authorizationRequests = [authorizationRequest];
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);

      await controller.onAuthorize({email, scopes});

      expect(mockOutlook.authorize).toHaveBeenCalledWith(email, scopes, {forcePicker: false});
      expect(authorizationRequest.resolve).toHaveBeenCalledWith('new-access-token');
      expect(controller.activateComponent).toHaveBeenCalled();
      expect(controller.authorizationRequests).toHaveLength(0);
    });

    it('should reject authorization request on error', async () => {
      const email = 'test@outlook.com';
      const error = new Error('Authorization failed');
      mockOutlook.authorize.mockRejectedValue(error);

      const authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.authorizationRequests = [authorizationRequest];

      await expect(controller.onAuthorize({email})).rejects.toThrow('Authorization failed');
      expect(authorizationRequest.reject).toHaveBeenCalledWith(error);
      expect(controller.authorizationRequests).toHaveLength(0);
    });

    it('should keep the pending request and the tab watch on account mismatch', async () => {
      const error = Object.assign(new Error('Email mismatch'), {
        code: 'OUTLOOK_ACCOUNT_MISMATCH',
        data: {intendedEmail: 'test@outlook.com', actualEmail: 'other@outlook.com'}
      });
      mockOutlook.authorize.mockRejectedValue(error);

      const authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.authorizationRequests = [authorizationRequest];
      controller.watchAuthTab(99);

      await expect(controller.onAuthorize({email: 'test@outlook.com', scopes: []})).rejects.toMatchObject({code: 'OUTLOOK_ACCOUNT_MISMATCH'});
      expect(authorizationRequest.reject).not.toHaveBeenCalled();
      expect(controller.authorizationRequests).toHaveLength(1);
      expect(controller.authTabListener).not.toBeNull();
    });

    it('should forward forcePicker to the module authorize', async () => {
      mockOutlook.authorize.mockResolvedValue('picked-token');
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);

      await controller.onAuthorize({email: 'test@outlook.com', scopes: [], forcePicker: true});

      expect(mockOutlook.authorize).toHaveBeenCalledWith('test@outlook.com', [], {forcePicker: true});
    });

    it('should not fail when no authorization request is pending', async () => {
      mockOutlook.authorize.mockResolvedValue('new-access-token');
      controller.activateComponent = jest.fn().mockResolvedValue(undefined);

      await expect(controller.onAuthorize({email: 'test@outlook.com', scopes: []})).resolves.toBeUndefined();
    });

    it('should map admin-consent errors to a localized message', async () => {
      const error = Object.assign(new Error('AADSTS65001: consent required'), {code: 'OUTLOOK_OAUTH_ADMIN_CONSENT'});
      mockOutlook.authorize.mockRejectedValue(error);

      const authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.authorizationRequests = [authorizationRequest];

      await expect(controller.onAuthorize({email: 'test@outlook.com'})).rejects.toMatchObject({
        code: 'OUTLOOK_OAUTH_ADMIN_CONSENT',
        message: 'outlook_oauth_error_admin_consent'
      });
      expect(authorizationRequest.reject).toHaveBeenCalledWith(expect.objectContaining({code: 'OUTLOOK_OAUTH_ADMIN_CONSENT'}));
    });
  });

  describe('cancelAuthorization()', () => {
    it('should reject all pending authorization requests as cancelled', () => {
      const first = {resolve: jest.fn(), reject: jest.fn()};
      const second = {resolve: jest.fn(), reject: jest.fn()};
      controller.authorizationRequests = [first, second];

      controller.cancelAuthorization();

      expect(first.reject).toHaveBeenCalledWith(expect.objectContaining({code: 'OUTLOOK_AUTH_CANCELLED'}));
      expect(second.reject).toHaveBeenCalledWith(expect.objectContaining({code: 'OUTLOOK_AUTH_CANCELLED'}));
      expect(controller.authorizationRequests).toHaveLength(0);
    });

    it('should do nothing without a pending request', () => {
      expect(() => controller.cancelAuthorization()).not.toThrow();
    });

    it('should cancel the pending request when the settings tab is closed', async () => {
      const mvelo = require('../../../src/lib/lib-mvelo').default;
      mvelo.tabs = {
        getActive: jest.fn().mockResolvedValue({id: 1}),
        loadAppTab: jest.fn().mockResolvedValue({id: 42})
      };
      const authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.authorizationRequests = [authorizationRequest];

      await controller.openAuthorizeDialog({email: 'test@outlook.com', scopes: []});

      const [onRemoved] = chrome.tabs.onRemoved.addListener.mock.calls.at(-1);
      onRemoved(41); // unrelated tab
      expect(authorizationRequest.reject).not.toHaveBeenCalled();
      onRemoved(42); // the settings tab
      expect(authorizationRequest.reject).toHaveBeenCalledWith(expect.objectContaining({code: 'OUTLOOK_AUTH_CANCELLED'}));
      expect(chrome.tabs.onRemoved.removeListener).toHaveBeenCalled();
    });
  });

  describe('checkAuthorization()', () => {
    it('should check if user has valid access token', async () => {
      mockOutlook.getAccessToken.mockResolvedValue('valid-token');

      const token = await controller.checkAuthorization({email: 'test@outlook.com'});

      expect(token).toBe('valid-token');
      expect(mockOutlook.getAccessToken).toHaveBeenCalledWith({
        email: 'test@outlook.com',
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Mail.Send'
        ]
      });
    });
  });

  describe('openAuthorizeDialog()', () => {
    it('should open settings page for OAuth authorization', async () => {
      const mvelo = require('../../../src/lib/lib-mvelo').default;
      mvelo.tabs = {
        getActive: jest.fn().mockResolvedValue({id: 'tab-123'}),
        loadAppTab: jest.fn().mockResolvedValue(undefined)
      };

      await controller.openAuthorizeDialog({
        email: 'test@outlook.com',
        scopes: ['https://graph.microsoft.com/Mail.Read']
      });

      expect(mvelo.tabs.loadAppTab).toHaveBeenCalledWith(
        expect.stringMatching(/\?slotId=.*#\/settings\/outlook-api\/auth/)
      );
    });
  });

  describe('activateComponent()', () => {
    it('should activate the tab', () => {
      const mvelo = require('../../../src/lib/lib-mvelo').default;
      mvelo.tabs = {
        activate: jest.fn()
      };

      controller.tabId = 'tab-456';
      controller.activateComponent();

      expect(mvelo.tabs.activate).toHaveBeenCalledWith({id: 'tab-456'});
    });
  });
});
