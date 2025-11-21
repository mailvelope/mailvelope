/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

// Mock dependencies - must be before imports
jest.mock('../../../src/lib/lib-mvelo');
jest.mock('../../../src/lib/util', () => ({
  ...jest.requireActual('../../../src/lib/util'),
  getUUID: jest.fn(() => 'mock-uuid-12345')
}));

import * as outlook from '../../../src/modules/outlook';

describe('Outlook module', () => {
  let mockChromeIdentity;
  let mockStorage;
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock chrome.identity
    mockChromeIdentity = {
      getRedirectURL: jest.fn(() => 'https://test-extension-id.chromiumapp.org/'),
      launchWebAuthFlow: jest.fn()
    };
    global.chrome = {
      ...global.chrome,
      identity: mockChromeIdentity,
      runtime: {
        getManifest: jest.fn(() => ({
          oauth2: {
            client_id: 'mock-client-id',
            scopes: ['https://graph.microsoft.com/Mail.Send']
          }
        }))
      }
    };

    // Get reference to storage mocks and set default responses
    const mvelo = require('../../../src/lib/lib-mvelo').default;
    mockStorage = mvelo.storage;
    mockStorage.get.mockResolvedValue({});
    mockStorage.set.mockResolvedValue(undefined);

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('authorize()', () => {
    it('should complete OAuth flow and store tokens', async () => {
      const email = 'test@outlook.com';

      // Mock OAuth authorization code flow (PKCE)
      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce('https://test-extension-id.chromiumapp.org/?code=auth-code-123&state=mock-uuid-12345');

      // Mock token exchange (first fetch call)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'access-token-456',
          refresh_token: 'refresh-token-789',
          expires_in: 3600,
          scope: 'User.Read Mail.Read Mail.Send offline_access'
        })
      });

      // Mock getUserInfo (second fetch call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-id-123',
          mail: 'test@outlook.com',
          userPrincipalName: 'test@outlook.com'
        })
      });

      const accessToken = await outlook.authorize(email);

      expect(accessToken).toBe('access-token-456');
      expect(mockStorage.set).toHaveBeenCalledWith(
        'mvelo.oauth.outlook',
        expect.objectContaining({
          'test@outlook.com': expect.objectContaining({
            access_token: 'access-token-456',
            refresh_token: 'refresh-token-789',
            scope: 'User.Read Mail.Read Mail.Send offline_access'
          })
        })
      );
    });

    it('should throw error if email mismatch', async () => {
      const email = 'test@outlook.com';

      // Mock OAuth authorization code flow (PKCE)
      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce('https://test-extension-id.chromiumapp.org/?code=auth-code-123&state=mock-uuid-12345');

      // Mock token exchange (first fetch call)
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'access-token-456',
          expires_in: 3600,
          scope: 'User.Read Mail.Read Mail.Send offline_access'
        })
      });

      // Mock getUserInfo with different email (second fetch call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-id-123',
          mail: 'different@outlook.com',
          userPrincipalName: 'different@outlook.com'
        })
      });

      await expect(outlook.authorize(email)).rejects.toThrow('Email mismatch');
    });
  });

  describe('getAccessToken()', () => {
    it('should return stored token if valid', async () => {
      const email = 'test@outlook.com';
      const futureTime = new Date().getTime() + 3600 * 1000; // 1 hour from now

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'stored-token-123',
          access_token_exp: futureTime,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access'
        }
      });

      const token = await outlook.getAccessToken({email, scopes: [outlook.OUTLOOK_SCOPE_MAIL_SEND]});

      expect(token).toBe('stored-token-123');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return undefined if token expired and no refresh token', async () => {
      const email = 'test@outlook.com';
      const pastTime = new Date().getTime() - 1000; // Expired

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'expired-token',
          access_token_exp: pastTime,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access'
        }
      });

      const token = await outlook.getAccessToken({email});

      expect(token).toBeUndefined();
    });

    it('should refresh token if expired but refresh token available', async () => {
      const email = 'test@outlook.com';
      const pastTime = new Date().getTime() - 1000; // Expired

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'expired-token',
          access_token_exp: pastTime,
          refresh_token: 'refresh-token-abc',
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access'
        }
      });

      // Mock refresh token response
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          scope: 'openid https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access'
        })
      });

      const token = await outlook.getAccessToken({email});

      expect(token).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
      expect(mockStorage.set).toHaveBeenCalled();
    });

    it('should return undefined if missing required scopes', async () => {
      const email = 'test@outlook.com';
      const futureTime = new Date().getTime() + 3600 * 1000;

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'stored-token-123',
          access_token_exp: futureTime,
          scope: 'openid https://graph.microsoft.com/User.Read' // Missing Mail.Send
        }
      });

      const token = await outlook.getAccessToken({email, scopes: [outlook.OUTLOOK_SCOPE_MAIL_SEND]});

      expect(token).toBeUndefined();
    });
  });

  describe('unauthorize()', () => {
    it('should revoke tokens and remove from storage', async () => {
      const email = 'test@outlook.com';

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456'
        },
        'other@outlook.com': {
          access_token: 'other-token'
        }
      });

      await outlook.unauthorize(email);

      // Microsoft doesn't have a revoke endpoint, so no fetch calls expected
      expect(mockFetch).not.toHaveBeenCalled();

      // Should update storage without the removed email
      expect(mockStorage.set).toHaveBeenCalledWith(
        'mvelo.oauth.outlook',
        expect.objectContaining({
          'other@outlook.com': expect.any(Object)
        })
      );
      expect(mockStorage.set).toHaveBeenCalledWith(
        'mvelo.oauth.outlook',
        expect.not.objectContaining({
          'test@outlook.com': expect.any(Object)
        })
      );
    });

    it('should handle missing email gracefully', async () => {
      const email = 'nonexistent@outlook.com';

      mockStorage.get.mockResolvedValue({});

      await outlook.unauthorize(email);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('getUserInfo()', () => {
    it('should fetch user info from Microsoft Graph', async () => {
      const accessToken = 'test-access-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-id-789',
          mail: 'user@contoso.com',
          userPrincipalName: 'user@contoso.com'
        })
      });

      const userInfo = await outlook.getUserInfo(accessToken);

      expect(userInfo).toEqual({
        id: 'user-id-789',
        mail: 'user@contoso.com',
        userPrincipalName: 'user@contoso.com'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            Accept: 'application/json'
          })
        })
      );
    });

    it('should throw error on API failure', async () => {
      const accessToken = 'test-access-token';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 'InvalidAuthenticationToken',
            message: 'Access token has expired'
          }
        })
      });

      await expect(outlook.getUserInfo(accessToken)).rejects.toThrow();
    });
  });
});
