/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MvError, deDup} from '../lib/util';
import {getUUID} from '../lib/util';

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
const OUTLOOK_OAUTH_STORE = 'mvelo.oauth.outlook';

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

// eslint-disable-next-line no-unused-vars
export async function getMessage(options) {
  throw new MvError('Outlook getMessage not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function getMessageMimeType(options) {
  throw new MvError('Outlook getMessageMimeType not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function getAttachment(options) {
  throw new MvError('Outlook getAttachment not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
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

// eslint-disable-next-line no-unused-vars
export function extractMailHeader(payload, name) {
  throw new MvError('Outlook extractMailHeader not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function extractMailBody(options) {
  throw new MvError('Outlook extractMailBody not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export function extractSignedMessageMultipart(rawEncoded) {
  throw new MvError('Outlook extractSignedMessageMultipart not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function getPGPSignatureAttId(options) {
  throw new MvError('Outlook getPGPSignatureAttId not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export async function getPGPEncryptedAttData(options) {
  throw new MvError('Outlook getPGPEncryptedAttData not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export function parseEmailAddress(address) {
  throw new MvError('Outlook parseEmailAddress not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}

// eslint-disable-next-line no-unused-vars
export function buildMail(options) {
  throw new MvError('Outlook buildMail not implemented yet (Phase 4 - Graph API Integration)', 'OUTLOOK_NOT_IMPLEMENTED');
}
