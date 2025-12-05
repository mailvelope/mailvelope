/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {goog} from './closure-library/closure/goog/emailaddress';
import mvelo from '../lib/lib-mvelo';
import {MvError, deDup} from '../lib/util';
import {getUUID} from '../lib/util';
import {parseSignedMessage} from './mime';

// PKCE helpers for SPA OAuth flow
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer) {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Azure AD App Registration - Mailvelope Outlook Integration
const CLIENT_ID = '3ebf6c8d-a369-4682-b4e9-a330d6b3a0a5';
// Note: SPA platform uses PKCE instead of client secret
const MICROSOFT_OAUTH_HOST = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MICROSOFT_GRAPH_HOST = 'https://graph.microsoft.com/v1.0';
const OUTLOOK_OAUTH_STORE = 'mvelo.oauth.outlook';
const OUTLOOK_MSGID_CACHE_PREFIX = 'mvelo.outlook.msgid.';

// ============================================================================
// Message ID Translation Cache
// ============================================================================

class MessageIdCache {
  constructor() {
    this.map = new Map(); // In-memory cache for fast access
  }

  /**
   * Get cached message IDs for a conversation
   * @param {string} conversationId - The Outlook conversation ID
   * @returns {Promise<{messageIds: string[], timestamp: number}|undefined>}
   */
  async get(conversationId) {
    const cacheKey = OUTLOOK_MSGID_CACHE_PREFIX + conversationId;
    // Check memory first
    if (this.map.has(conversationId)) {
      return this.map.get(conversationId);
    }
    // Check session storage
    const {[cacheKey]: cached} = await chrome.storage.session.get(cacheKey);
    if (cached) {
      this.map.set(conversationId, cached);
      return cached;
    }
  }

  /**
   * Store message IDs for a conversation
   * @param {string} conversationId - The Outlook conversation ID
   * @param {string[]} messageIds - Array of Graph API message IDs in chronological order
   */
  async set(conversationId, messageIds) {
    const cacheKey = OUTLOOK_MSGID_CACHE_PREFIX + conversationId;
    const data = {messageIds, timestamp: Date.now()};
    this.map.set(conversationId, data);
    await chrome.storage.session.set({[cacheKey]: data});
  }

  /**
   * Remove cached message IDs for a conversation
   * @param {string} conversationId - The Outlook conversation ID
   */
  async delete(conversationId) {
    const cacheKey = OUTLOOK_MSGID_CACHE_PREFIX + conversationId;
    this.map.delete(conversationId);
    await chrome.storage.session.remove(cacheKey);
  }
}

// Singleton instance of the cache
const messageIdCache = new MessageIdCache();

/**
 * Resolve a local message ID to a Microsoft Graph message ID
 * Local ID format: "conversationId#messageIndex"
 * @param {string} localMsgId - Local message ID from content script
 * @param {string} accessToken - Valid access token
 * @returns {Promise<string>} Graph API message ID
 */
async function resolveGraphMessageId(localMsgId, accessToken) {
  const [conversationId, indexStr] = localMsgId.split('#');
  const messageIndex = parseInt(indexStr, 10);
  if (!conversationId || isNaN(messageIndex)) {
    throw new MvError(`Invalid local message ID format: ${localMsgId}`, 'OUTLOOK_API_ERROR');
  }
  // Check cache first
  let cached = await messageIdCache.get(conversationId);
  if (!cached) {
    // Fetch all messages in the conversation from Graph API
    // Note: Cannot use $orderby with $filter on conversationId (Graph API limitation:
    // "The restriction or sort order is too complex for this operation")
    // Fetch metadata only and sort client-side
    const url = `${MICROSOFT_GRAPH_HOST}/me/messages?$filter=conversationId eq '${conversationId}'&$select=id,receivedDateTime`;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    };
    try {
      const response = await fetchJSON(url, options);
      // Sort by receivedDateTime ascending (oldest first) to match DOM order
      const sortedMessages = response.value.sort((a, b) =>
        new Date(a.receivedDateTime) - new Date(b.receivedDateTime)
      );
      const messageIds = sortedMessages.map(msg => msg.id);
      await messageIdCache.set(conversationId, messageIds);
      cached = {messageIds};
    } catch (error) {
      // Clear cache entry on error
      await messageIdCache.delete(conversationId);
      throw error;
    }
  }
  // Get the message ID at the specified index
  if (messageIndex >= cached.messageIds.length) {
    throw new MvError(`Message index ${messageIndex} out of bounds (conversation has ${cached.messageIds.length} messages)`, 'OUTLOOK_API_ERROR');
  }
  return cached.messageIds[messageIndex];
}

export const OUTLOOK_SCOPE_USER_READ = 'https://graph.microsoft.com/User.Read';
export const OUTLOOK_SCOPE_MAIL_READ = 'https://graph.microsoft.com/Mail.Read';
export const OUTLOOK_SCOPE_MAIL_SEND = 'https://graph.microsoft.com/Mail.Send';
export const OUTLOOK_SCOPE_OFFLINE_ACCESS = 'offline_access';

const OUTLOOK_SCOPES_DEFAULT = ['openid', OUTLOOK_SCOPE_USER_READ];

export async function getAccessToken({email, scopes = []}) {
  scopes = deDup([...OUTLOOK_SCOPES_DEFAULT, ...scopes]);
  const storedTokens = await mvelo.storage.get(OUTLOOK_OAUTH_STORE);
  const storedToken = storedTokens?.[email];
  if (!storedToken || !scopes.every(scope => storedToken.scope.split(' ').includes(scope))) {
    return;
  }
  if (checkStoredToken(storedToken)) {
    return storedToken.access_token;
  }
  if (storedToken.refresh_token) {
    const refreshedToken = await getRefreshedAccessToken(storedToken.refresh_token);
    if (refreshedToken.access_token) {
      await storeAuthData(email, buildAuthMeta(refreshedToken));
      return refreshedToken.access_token;
    }
  }
}

function checkStoredToken(storedData) {
  return storedData.access_token && (storedData.access_token_exp >= new Date().getTime());
}

export async function authorize(email, scopes = [OUTLOOK_SCOPE_MAIL_READ, OUTLOOK_SCOPE_MAIL_SEND, OUTLOOK_SCOPE_OFFLINE_ACCESS]) {
  scopes = deDup([...OUTLOOK_SCOPES_DEFAULT, ...scopes]);
  // Generate PKCE code verifier
  const codeVerifier = generateCodeVerifier();
  // Get authorization code
  let auth = await getAuthCode(email, scopes, codeVerifier);
  if (!auth.code) {
    throw new MvError('Authorization failed!', 'OUTLOOK_OAUTH_ERROR');
  }
  // If prompt=none returned (no refresh token), re-authorize with consent
  if (auth.prompt === 'none') {
    auth = await getAuthCode(email, scopes, codeVerifier, 'consent');
  }
  // Exchange code for tokens
  const tokens = await getAuthTokens(auth.code, codeVerifier);
  if (!tokens.access_token) {
    throw new MvError('Token exchange failed', 'OUTLOOK_OAUTH_ERROR');
  }
  // Get user info to validate email
  const userInfo = await getUserInfo(tokens.access_token);
  const userEmail = userInfo.mail || userInfo.userPrincipalName;
  if (userEmail !== email) {
    throw new MvError(`Email mismatch: expected ${email}, got ${userEmail}`, 'OAUTH_VALIDATION_ERROR');
  }
  // Store tokens
  await storeAuthData(email, buildAuthMeta({...userInfo, ...tokens}));
  return tokens.access_token;
}

export async function unauthorize(email) {
  const authMetaData = await mvelo.storage.get(OUTLOOK_OAUTH_STORE);
  if (!authMetaData?.[email]) {
    return;
  }
  const token = authMetaData[email];
  if (token.access_token) {
    await revokeToken(token.access_token);
  }
  if (token.refresh_token) {
    await revokeToken(token.refresh_token);
  }
  delete authMetaData[email];
  await mvelo.storage.set(OUTLOOK_OAUTH_STORE, authMetaData);
}

async function getAuthCode(email, scopes, codeVerifier, prompt) {
  const redirectURL = chrome.identity.getRedirectURL();
  const state = getUUID();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const auth_params = {
    client_id: CLIENT_ID,
    login_hint: email,
    redirect_uri: redirectURL,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  };
  if (prompt) {
    auth_params.prompt = prompt;
  }
  const url = `${MICROSOFT_OAUTH_HOST}/authorize?${new URLSearchParams(Object.entries(auth_params))}`;
  const responseURL = await chrome.identity.launchWebAuthFlow({url, interactive: true});
  const search = new URL(responseURL).searchParams;
  if (search.get('state') !== state) {
    throw new Error('oauth2/v2.0/authorize: wrong state parameter');
  }
  return {
    code: search.get('code'),
    prompt: search.get('prompt')
  };
}

async function getAuthTokens(authCode, codeVerifier) {
  const url = `${MICROSOFT_OAUTH_HOST}/token`;
  const params = {
    client_id: CLIENT_ID,
    code: authCode,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: chrome.identity.getRedirectURL()
  };
  const result = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams(Object.entries(params)).toString(),
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return result.json();
}

async function getRefreshedAccessToken(refresh_token) {
  const url = `${MICROSOFT_OAUTH_HOST}/token`;
  const params = {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token
  };
  const result = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams(Object.entries(params)).toString(),
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return result.json();
}

export async function getUserInfo(accessToken) {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    contentType: 'json'
  };
  const userInfo = await fetchJSON('https://graph.microsoft.com/v1.0/me', options);
  return {
    id: userInfo.id,
    mail: userInfo.mail,
    userPrincipalName: userInfo.userPrincipalName
  };
}

async function revokeToken() {
  // Microsoft doesn't have a simple revoke endpoint like Google
  // Tokens are revoked by removing them from storage
  // They will expire naturally (access token: 1 hour, refresh token: 90 days)
}

function buildAuthMeta(token) {
  const data = {
    access_token: token.access_token,
    access_token_exp: new Date().getTime() + token.expires_in * 1000,
    scope: token.scope
  };
  if (token.refresh_token) {
    data.refresh_token = token.refresh_token;
  }
  // Note: License enforcement deferred to Phase 4
  return data;
}

async function storeAuthData(email, data) {
  let entries = await mvelo.storage.get(OUTLOOK_OAUTH_STORE);
  if (entries) {
    entries[email] = {...entries[email], ...data};
  } else {
    entries = {[email]: data};
  }
  return mvelo.storage.set(OUTLOOK_OAUTH_STORE, entries);
}

async function fetchJSON(resource, options) {
  const response = await fetch(resource, options);
  const json = await response.json();
  if (!response.ok) {
    throw new MvError(json.error_description ?? json.error?.message, 'OUTLOOK_API_ERROR');
  }
  return json;
}

// ============================================================================
// Graph API Methods
// ============================================================================

/**
 * Get message from Microsoft Graph API
 * @param {Object} options
 * @param {string} options.msgId - Local message ID (conversationId#index) or Graph message ID
 * @param {string} options.email - User email (for token lookup)
 * @param {string} options.accessToken - Access token
 * @param {string} [options.format='full'] - Format: 'full', 'raw', or 'metadata'
 * @param {string[]} [options.metaHeaders] - Headers to include for metadata format
 * @returns {Promise<Object>} Message object with payload property (for compatibility with Gmail pattern)
 */
// eslint-disable-next-line no-unused-vars -- email and metaHeaders kept for API compatibility with Gmail
export async function getMessage({msgId, email, accessToken, format = 'full', metaHeaders = []}) {
  // Resolve local msgId to Graph ID if needed
  let graphMsgId = msgId;
  if (msgId.includes('#')) {
    graphMsgId = await resolveGraphMessageId(msgId, accessToken);
  }
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  };
  // Handle different formats
  if (format === 'raw') {
    // Get MIME content
    const response = await fetch(`${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}/$value`, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new MvError(errorText || 'Failed to get message MIME content', 'OUTLOOK_API_ERROR');
    }
    const raw = await response.text();
    // Encode as base64 for compatibility with Gmail pattern
    return {raw: btoa(unescape(encodeURIComponent(raw)))};
  }
  // Build URL with query parameters
  let url = `${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}`;
  const queryParams = [];
  if (format === 'metadata') {
    // Select only specified headers plus standard fields
    const selectFields = ['id', 'conversationId', 'subject', 'from', 'toRecipients', 'ccRecipients', 'receivedDateTime', 'internetMessageHeaders'];
    queryParams.push(`$select=${selectFields.join(',')}`);
  } else {
    // Full format - include body and attachments info
    queryParams.push('$expand=attachments($select=id,name,contentType,size)');
  }
  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }
  const message = await fetchJSON(url, options);
  // Wrap response in payload property for compatibility with Gmail/controller pattern
  return {payload: message};
}

/**
 * Get message MIME type from Graph API
 * @param {Object} options
 * @param {string} options.msgId - Local message ID or Graph message ID
 * @param {string} options.email - User email
 * @param {string} options.accessToken - Access token
 * @returns {Promise<{mimeType: string, protocol: string}>}
 */
export async function getMessageMimeType({msgId, email, accessToken}) {
  const {payload} = await getMessage({msgId, email, accessToken, format: 'metadata'});
  const contentType = extractMailHeader(payload, 'Content-Type');
  // Parse protocol from Content-Type (e.g., "multipart/signed; protocol="application/pgp-signature"")
  let protocol = '';
  const protocolMatch = contentType.match(/protocol="?([^";]+)"?/i);
  if (protocolMatch) {
    protocol = protocolMatch[1];
  }
  // Extract MIME type (first part before semicolon)
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  return {mimeType, protocol};
}

/**
 * Get attachment from Graph API
 * @param {Object} options
 * @param {string} options.msgId - Local message ID or Graph message ID
 * @param {string} options.email - User email
 * @param {string} [options.attachmentId] - Attachment ID (optional if fileName provided)
 * @param {string} [options.fileName] - Attachment filename to find
 * @param {string} options.accessToken - Access token
 * @returns {Promise<{data: string, size: number, mimeType: string}>} Data as data URL
 */
// eslint-disable-next-line no-unused-vars -- email kept for API compatibility with Gmail
export async function getAttachment({msgId, email, attachmentId, fileName, accessToken}) {
  // Resolve local msgId to Graph ID if needed
  let graphMsgId = msgId;
  if (msgId.includes('#')) {
    graphMsgId = await resolveGraphMessageId(msgId, accessToken);
  }
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  };
  // If no attachmentId, find by filename
  if (!attachmentId && fileName) {
    const listUrl = `${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}/attachments?$select=id,name,contentType,size`;
    const attachments = await fetchJSON(listUrl, options);
    const attachment = attachments.value.find(a => a.name === fileName);
    if (!attachment) {
      throw new MvError(`Attachment not found: ${fileName}`, 'OUTLOOK_API_ERROR');
    }
    attachmentId = attachment.id;
  }
  if (!attachmentId) {
    throw new MvError('Attachment ID or filename required', 'OUTLOOK_API_ERROR');
  }
  // Get attachment content
  const url = `${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}/attachments/${attachmentId}`;
  const attachment = await fetchJSON(url, options);
  // Graph API returns contentBytes as base64
  return {
    data: `data:${attachment.contentType};base64,${attachment.contentBytes}`,
    size: attachment.size,
    mimeType: attachment.contentType
  };
}

// eslint-disable-next-line no-unused-vars
export async function sendMessage(options) {
  throw new MvError('Outlook sendMessage not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function checkLicense(userInfo) {
  // License enforcement deferred to Phase 4/5
  // For now, allow all accounts
  return;
}

/**
 * Extract email header from Graph API message payload
 * Graph API stores standard headers as properties (from, toRecipients, subject)
 * and non-standard headers in internetMessageHeaders array
 * @param {Object} payload - Graph API message object
 * @param {string} name - Header name (case-insensitive)
 * @returns {string} Header value or empty string if not found
 */
export function extractMailHeader(payload, name) {
  const lowerName = name.toLowerCase();
  // Format email address as RFC 5322 string
  const formatEmailAddress = emailAddr => {
    if (!emailAddr) {
      return '';
    }
    if (emailAddr.name) {
      return `"${emailAddr.name}" <${emailAddr.address}>`;
    }
    return emailAddr.address;
  };
  // Handle standard Graph API properties
  switch (lowerName) {
    case 'from':
      return formatEmailAddress(payload.from?.emailAddress);
    case 'to':
      return payload.toRecipients?.map(r => formatEmailAddress(r.emailAddress)).join(', ') || '';
    case 'cc':
      return payload.ccRecipients?.map(r => formatEmailAddress(r.emailAddress)).join(', ') || '';
    case 'bcc':
      return payload.bccRecipients?.map(r => formatEmailAddress(r.emailAddress)).join(', ') || '';
    case 'subject':
      return payload.subject || '';
    case 'date':
      return payload.receivedDateTime || payload.sentDateTime || '';
    case 'message-id':
      return payload.internetMessageId || '';
  }
  // Fall back to internetMessageHeaders array for other headers (e.g., Content-Type)
  if (payload.internetMessageHeaders) {
    const header = payload.internetMessageHeaders.find(
      h => h.name.toLowerCase() === lowerName
    );
    if (header) {
      return header.value;
    }
  }
  return '';
}

/**
 * Extract mail body content from Graph API message
 * Handles both inline PGP content and encrypted attachments
 * @param {Object} options
 * @param {Object} options.payload - Graph API message object
 * @param {string} options.userEmail - User email
 * @param {string} options.msgId - Message ID
 * @param {string} options.accessToken - Access token
 * @param {string} [options.type] - Content type hint ('text', 'html', or mime type)
 * @returns {Promise<string>} Message body content
 */
// eslint-disable-next-line no-unused-vars -- type kept for API compatibility with Gmail
export async function extractMailBody({payload, userEmail, msgId, accessToken, type}) {
  // Check Content-Type to determine how to extract body
  const contentType = extractMailHeader(payload, 'Content-Type').toLowerCase();
  // For multipart/encrypted, body is in the encrypted.asc attachment
  if (contentType.includes('multipart/encrypted')) {
    const encData = await getPGPEncryptedAttData({msgId, email: userEmail, accessToken});
    if (encData) {
      const {data} = await getAttachment({
        msgId,
        email: userEmail,
        attachmentId: encData.attachmentId,
        fileName: encData.fileName,
        accessToken
      });
      // Extract base64 content from data URL and decode
      const base64Content = data.split(',')[1];
      return atob(base64Content);
    }
  }
  // For standard messages, return body content
  if (payload.body) {
    return payload.body.content || '';
  }
  return '';
}

/**
 * Extract signed message parts from base64-encoded raw MIME content
 * @param {string} rawEncoded - Base64-encoded raw MIME content
 * @returns {{signedMessage: string, message: string, attachments: Array}} Parsed message parts
 */
export function extractSignedMessageMultipart(rawEncoded) {
  // Decode base64 to raw MIME (Graph API uses standard base64)
  const raw = atob(rawEncoded);
  // Use shared MIME parser
  return parseSignedMessage(raw, 'html');
}

/**
 * Find PGP signature attachment ID in a message
 * @param {Object} options
 * @param {string} options.msgId - Local message ID or Graph message ID
 * @param {string} options.email - User email
 * @param {string} options.accessToken - Access token
 * @returns {Promise<string|undefined>} Attachment ID or undefined if not found
 */
// eslint-disable-next-line no-unused-vars -- email kept for API compatibility with Gmail
export async function getPGPSignatureAttId({msgId, email, accessToken}) {
  // Resolve local msgId to Graph ID if needed
  let graphMsgId = msgId;
  if (msgId.includes('#')) {
    graphMsgId = await resolveGraphMessageId(msgId, accessToken);
  }
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  };
  const url = `${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}/attachments?$select=id,name,contentType`;
  const attachments = await fetchJSON(url, options);
  // Find PGP signature attachment
  const sigAttachment = attachments.value.find(att =>
    att.contentType === 'application/pgp-signature' ||
    att.name?.toLowerCase().includes('signature') && att.name?.toLowerCase().endsWith('.asc')
  );
  return sigAttachment?.id;
}

/**
 * Find PGP encrypted attachment data in a message
 * @param {Object} options
 * @param {string} options.msgId - Local message ID or Graph message ID
 * @param {string} options.email - User email
 * @param {string} options.accessToken - Access token
 * @returns {Promise<{attachmentId: string, fileName: string}|undefined>} Attachment info or undefined
 */
// eslint-disable-next-line no-unused-vars -- email kept for API compatibility with Gmail
export async function getPGPEncryptedAttData({msgId, email, accessToken}) {
  // Resolve local msgId to Graph ID if needed
  let graphMsgId = msgId;
  if (msgId.includes('#')) {
    graphMsgId = await resolveGraphMessageId(msgId, accessToken);
  }
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  };
  const url = `${MICROSOFT_GRAPH_HOST}/me/messages/${graphMsgId}/attachments?$select=id,name,contentType`;
  const attachments = await fetchJSON(url, options);
  // Find PGP encrypted attachment:
  // 1. application/pgp-encrypted - version indicator containing "Version: 1"
  // 2. application/octet-stream named "encrypted.asc"
  const encAttachment = attachments.value.find(att => {
    const name = att.name?.toLowerCase() || '';
    const contentType = att.contentType?.toLowerCase() || '';
    // Check for encrypted.asc (standard PGP/MIME encrypted data attachment)
    if (name === 'encrypted.asc') {
      return true;
    }
    // Check for octet-stream with PGP file extension
    if (contentType === 'application/octet-stream') {
      if (name.endsWith('.asc') || name.endsWith('.pgp') || name.endsWith('.gpg')) {
        // Exclude signature files
        if (!name.includes('signature')) {
          return true;
        }
      }
    }
    return false;
  });
  if (encAttachment) {
    return {
      attachmentId: encAttachment.id,
      fileName: encAttachment.name
    };
  }
}

/**
 * Parse email address string into components
 * @param {string} address - Email address string (e.g., "John Doe <john@example.com>")
 * @returns {{email: string, name: string}}
 */
export function parseEmailAddress(address) {
  const emailAddress = goog.format.EmailAddress.parse(address);
  if (!emailAddress.isValid()) {
    throw new Error('Parsing email address failed.');
  }
  return {email: emailAddress.getAddress(), name: emailAddress.getName()};
}

// eslint-disable-next-line no-unused-vars
export function buildMail(options) {
  throw new MvError('Outlook buildMail not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}
