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

import * as outlook from '../../../src/modules/outlook';

// Scope format as returned by the live Microsoft token endpoint (M1-captured):
// full Graph URIs, offline_access never echoed
const LIVE_SCOPE = 'openid profile email https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';

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
    // Mock chrome.storage.session for MessageIdCache
    const mockSessionStorage = {};
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
      },
      storage: {
        ...global.chrome?.storage,
        session: {
          get: jest.fn(key => Promise.resolve({[key]: mockSessionStorage[key]})),
          set: jest.fn(obj => {
            Object.assign(mockSessionStorage, obj);
            return Promise.resolve();
          }),
          remove: jest.fn(key => {
            delete mockSessionStorage[key];
            return Promise.resolve();
          })
        }
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
        ok: true,
        json: async () => ({
          access_token: 'access-token-456',
          refresh_token: 'refresh-token-789',
          expires_in: 3600,
          scope: LIVE_SCOPE
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
            scope: LIVE_SCOPE
          })
        })
      );
    });

    it('should accept a case-insensitive match on the userPrincipalName', async () => {
      const email = 'test@outlook.com';

      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce('https://test-extension-id.chromiumapp.org/?code=auth-code-123&state=mock-uuid-12345');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token-456',
          expires_in: 3600,
          scope: LIVE_SCOPE
        })
      });

      // Primary SMTP address differs, UPN matches except for case
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-id-123',
          mail: 'other.alias@contoso.com',
          userPrincipalName: 'Test@Outlook.com'
        })
      });

      const accessToken = await outlook.authorize(email);

      expect(accessToken).toBe('access-token-456');
    });

    it('should classify an admin-consent error from the token exchange', async () => {
      const email = 'test@outlook.com';

      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce('https://test-extension-id.chromiumapp.org/?code=auth-code-123&state=mock-uuid-12345');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: {get: () => 'application/json; charset=utf-8'},
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'AADSTS65001: The user or administrator has not consented.',
          error_codes: [65001]
        })
      });

      await expect(outlook.authorize(email)).rejects.toMatchObject({code: 'OUTLOOK_OAUTH_ADMIN_CONSENT'});
    });

    it('should classify an admin-consent error from the authorization redirect', async () => {
      const errorDescription = encodeURIComponent('AADSTS65001: The user or administrator has not consented to use the application.');
      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce(`https://test-extension-id.chromiumapp.org/?error=consent_required&error_description=${errorDescription}&state=mock-uuid-12345`);

      await expect(outlook.authorize('test@outlook.com')).rejects.toMatchObject({
        code: 'OUTLOOK_OAUTH_ADMIN_CONSENT',
        data: {error: 'consent_required', error_codes: [65001]}
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error if email mismatch', async () => {
      const email = 'test@outlook.com';

      // Mock OAuth authorization code flow (PKCE)
      mockChromeIdentity.launchWebAuthFlow
      .mockResolvedValueOnce('https://test-extension-id.chromiumapp.org/?code=auth-code-123&state=mock-uuid-12345');

      // Mock token exchange (first fetch call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token-456',
          expires_in: 3600,
          scope: LIVE_SCOPE
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
          scope: LIVE_SCOPE
        }
      });

      const token = await outlook.getAccessToken({email, scopes: [outlook.OUTLOOK_SCOPE_MAIL_SEND]});

      expect(token).toBe('stored-token-123');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not require offline_access in the stored scope', async () => {
      const email = 'test@outlook.com';
      const futureTime = new Date().getTime() + 3600 * 1000;

      // Stored scope is the token-response echo, which never contains offline_access
      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'stored-token-123',
          access_token_exp: futureTime,
          scope: LIVE_SCOPE
        }
      });

      const token = await outlook.getAccessToken({email, scopes: [outlook.OUTLOOK_SCOPE_MAIL_SEND, outlook.OUTLOOK_SCOPE_OFFLINE_ACCESS]});

      expect(token).toBe('stored-token-123');
    });

    it('should return undefined if token expired and no refresh token', async () => {
      const email = 'test@outlook.com';
      const pastTime = new Date().getTime() - 1000; // Expired

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'expired-token',
          access_token_exp: pastTime,
          scope: LIVE_SCOPE
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
          scope: LIVE_SCOPE
        }
      });

      // Mock refresh token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          scope: LIVE_SCOPE
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
      // Refresh request carries the stored scope
      const [, {body}] = mockFetch.mock.calls[0];
      expect(new URLSearchParams(body).get('scope')).toBe(LIVE_SCOPE);
      expect(mockStorage.set).toHaveBeenCalled();
    });

    it('should refresh a token that expires within the buffer', async () => {
      const email = 'test@outlook.com';
      const withinBuffer = new Date().getTime() + 60 * 1000; // 1 min from now

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'nearly-expired-token',
          access_token_exp: withinBuffer,
          refresh_token: 'refresh-token-abc',
          scope: LIVE_SCOPE
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          scope: LIVE_SCOPE
        })
      });

      const token = await outlook.getAccessToken({email});

      expect(token).toBe('new-access-token');
    });

    it('should remove stale credentials when the refresh token is rejected with invalid_grant', async () => {
      const email = 'test@outlook.com';
      const pastTime = new Date().getTime() - 1000;

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'expired-token',
          access_token_exp: pastTime,
          refresh_token: 'revoked-refresh-token',
          scope: LIVE_SCOPE
        },
        'other@outlook.com': {
          access_token: 'other-token'
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: {get: () => 'application/json; charset=utf-8'},
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'AADSTS70000: The refresh token has expired.',
          error_codes: [70000]
        })
      });

      const token = await outlook.getAccessToken({email});

      expect(token).toBeUndefined();
      expect(mockStorage.set).toHaveBeenCalledWith(
        'mvelo.oauth.outlook',
        expect.not.objectContaining({
          'test@outlook.com': expect.any(Object)
        })
      );
    });

    it('should fall back to interactive authorization when the token endpoint returns an HTML error page', async () => {
      const email = 'test@outlook.com';
      const pastTime = new Date().getTime() - 1000;

      mockStorage.get.mockResolvedValue({
        'test@outlook.com': {
          access_token: 'expired-token',
          access_token_exp: pastTime,
          refresh_token: 'refresh-token-abc',
          scope: LIVE_SCOPE
        }
      });

      // Microsoft answers some terminal conditions with an HTML error page
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: {get: () => 'text/html; charset=utf-8'}
      });

      const token = await outlook.getAccessToken({email});

      expect(token).toBeUndefined();
      // Credentials are kept: the failure cannot be classified as terminal
      expect(mockStorage.set).not.toHaveBeenCalled();
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

  describe('message ID resolution via getMessage()', () => {
    const accessToken = 'test-access-token';

    // Messages in the conversation, newest first (matching the expected local index order);
    // the mocked Graph response is shuffled to reverse order to exercise the client-side sort
    function mockConversationResponse(messages) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: messages.map(({id, imid}, index) => ({
            id,
            receivedDateTime: new Date(2026, 0, 1, messages.length - index).toISOString(),
            internetMessageId: imid ?? `<${id}@test>`
          })).reverse()
        })
      });
    }

    function mockMessageResponse(id) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({id})
      });
    }

    it('should escape and URL-encode the conversationId in the $filter query', async () => {
      const conversationId = "AAQkAD'quote+plus";
      mockConversationResponse([{id: 'graph-id-0'}]);
      mockMessageResponse('graph-id-0');

      await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});

      const expectedFilter = encodeURIComponent("conversationId eq 'AAQkAD''quote+plus'");
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `https://graph.microsoft.com/v1.0/me/messages?$filter=${expectedFilter}&$select=id,receivedDateTime,internetMessageId`,
        expect.any(Object)
      );
    });

    it('should map local indexes newest-first and cache the resolved IDs per conversation', async () => {
      const conversationId = 'AAQkADcacheHit';
      mockConversationResponse([{id: 'graph-id-newest'}, {id: 'graph-id-oldest'}]);
      mockMessageResponse('graph-id-newest');
      mockMessageResponse('graph-id-oldest');

      await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/me/messages/graph-id-newest'),
        expect.any(Object)
      );

      await outlook.getMessage({msgId: `${conversationId}#1`, accessToken});
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/me/messages/graph-id-oldest'),
        expect.any(Object)
      );

      // One conversation lookup, two message fetches
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should dedupe folder copies sharing an internetMessageId', async () => {
      const conversationId = 'AAQkADdupes';
      mockConversationResponse([
        {id: 'copy-newer', imid: '<m1@test>'},
        {id: 'copy-older', imid: '<m1@test>'}
      ]);
      mockMessageResponse('copy-older');

      await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/me/messages/copy-older'),
        expect.any(Object)
      );
    });

    it('should follow @odata.nextLink to collect all messages of the conversation', async () => {
      const conversationId = 'AAQkADpaged';
      const nextLink = 'https://graph.microsoft.com/v1.0/me/messages?$skiptoken=page2';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [{id: 'graph-id-newest', receivedDateTime: '2026-01-02T00:00:00Z', internetMessageId: '<newest@test>'}],
          '@odata.nextLink': nextLink
        })
      });
      mockConversationResponse([{id: 'graph-id-oldest'}]);
      mockMessageResponse('graph-id-oldest');

      await outlook.getMessage({msgId: `${conversationId}#1`, accessToken});

      expect(mockFetch).toHaveBeenNthCalledWith(2, nextLink, expect.any(Object));
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/me/messages/graph-id-oldest'),
        expect.any(Object)
      );
    });

    it('should refetch the conversation after the cache TTL expired', async () => {
      const conversationId = 'AAQkADttlExpiry';
      mockConversationResponse([{id: 'graph-id-0'}]);
      mockMessageResponse('graph-id-0');

      await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5 * 60 * 1000 + 1);
      try {
        mockConversationResponse([{id: 'graph-id-0'}]);
        mockMessageResponse('graph-id-0');
        await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});
      } finally {
        nowSpy.mockRestore();
      }

      // Two conversation lookups, two message fetches
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should refetch the conversation if the cached entry misses the message index', async () => {
      const conversationId = 'AAQkADgrown';
      mockConversationResponse([{id: 'graph-id-A'}]);
      mockMessageResponse('graph-id-A');

      await outlook.getMessage({msgId: `${conversationId}#0`, accessToken});

      // New message arrived since caching: it takes index 0, the old message shifts to 1
      mockConversationResponse([{id: 'graph-id-B'}, {id: 'graph-id-A'}]);
      mockMessageResponse('graph-id-A');

      await outlook.getMessage({msgId: `${conversationId}#1`, accessToken});

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/me/messages/graph-id-A'),
        expect.any(Object)
      );
    });

    it('should throw if the message index is out of bounds after a fresh fetch', async () => {
      const conversationId = 'AAQkADoutOfBounds';
      mockConversationResponse([{id: 'graph-id-0'}]);

      await expect(outlook.getMessage({msgId: `${conversationId}#5`, accessToken})).rejects.toThrow('out of bounds');

      // Fresh fetch is not repeated
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractMailBody()', () => {
    const accessToken = 'test-access-token';

    it('should return the plain body content of a standard message', async () => {
      const payload = {body: {content: 'Hello, here is my public key.'}};

      const body = await outlook.extractMailBody({payload, msgId: 'AAMkgraph-id', accessToken});

      expect(body).toBe('Hello, here is my public key.');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should read the body from the encrypted attachment for multipart/encrypted', async () => {
      const payload = {
        body: {content: 'this placeholder must not be returned'},
        internetMessageHeaders: [
          {name: 'Content-Type', value: 'multipart/encrypted; protocol="application/pgp-encrypted"; boundary=abc'}
        ]
      };
      // PGP armor is ASCII by definition; `atob` is byte-oriented, so keep the fixture ASCII
      const armored = '-----BEGIN PGP MESSAGE-----\r\n\r\nwcFMA9q70hY3pC6PAQ/+Lihh\r\n=Kxb1\r\n-----END PGP MESSAGE-----';
      // getPGPEncryptedAttData lists the attachments…
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({value: [{id: 'att-1', name: 'encrypted.asc', contentType: 'application/octet-stream'}]})
      });
      // …then getAttachment fetches the content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          contentType: 'application/octet-stream',
          contentBytes: btoa(armored),
          size: armored.length
        })
      });

      const body = await outlook.extractMailBody({payload, msgId: 'AAMkgraph-id', accessToken});

      expect(body).toBe(armored);
    });

    it('should fall back to the plain body when no encrypted attachment is found', async () => {
      const payload = {
        body: {content: 'fallback body'},
        internetMessageHeaders: [{name: 'Content-Type', value: 'multipart/encrypted; boundary=abc'}]
      };
      mockFetch.mockResolvedValueOnce({ok: true, json: async () => ({value: []})});

      const body = await outlook.extractMailBody({payload, msgId: 'AAMkgraph-id', accessToken});

      expect(body).toBe('fallback body');
    });

    it('should return an empty string when the message has no body', async () => {
      const body = await outlook.extractMailBody({payload: {}, msgId: 'AAMkgraph-id', accessToken});

      expect(body).toBe('');
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
