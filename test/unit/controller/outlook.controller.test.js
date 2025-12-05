/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

// Mock dependencies - must be before imports
jest.mock('../../../src/modules/mime', () => ({
  parseSignedMessage: jest.fn(() => ({signedMessage: '', message: '', attachments: []}))
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
    });

    it('should activate existing editor if popup already exists', async () => {
      const options = {
        userInfo: {email: 'user@outlook.com'}
      };

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
      expect(controller.authorizationRequest).toBeDefined();
      controller.authorizationRequest.resolve('new-token-456');

      const token = await tokenPromise;
      expect(token).toBe('new-token-456');
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
      controller.activateComponent = jest.fn();

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

      controller.authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };
      controller.activateComponent = jest.fn();

      await controller.onAuthorize({email, scopes});

      expect(mockOutlook.authorize).toHaveBeenCalledWith(email, scopes);
      expect(controller.authorizationRequest.resolve).toHaveBeenCalledWith('new-access-token');
      expect(controller.activateComponent).toHaveBeenCalled();
    });

    it('should reject authorization request on error', async () => {
      const email = 'test@outlook.com';
      const error = new Error('Authorization failed');
      mockOutlook.authorize.mockRejectedValue(error);

      controller.authorizationRequest = {
        resolve: jest.fn(),
        reject: jest.fn()
      };

      await expect(controller.onAuthorize({email})).rejects.toThrow('Authorization failed');
      expect(controller.authorizationRequest.reject).toHaveBeenCalledWith(error);
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
