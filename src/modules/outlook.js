/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MvError, deDup} from '../lib/util';
import {getUUID} from '../lib/util';

// Placeholder Client ID - will be replaced with real Azure AD app registration
const CLIENT_ID = 'PLACEHOLDER-AZURE-CLIENT-ID';
const CLIENT_SECRET = 'PLACEHOLDER-AZURE-CLIENT-SECRET';
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
  // Incremental authorization to prevent checkboxes for the requested scopes on the consent screen
  const access_token = await getAuthToken(email, OUTLOOK_SCOPES_DEFAULT);
  const userInfo = await getUserInfo(access_token);
  const userEmail = userInfo.mail || userInfo.userPrincipalName;
  if (userEmail !== email) {
    throw new MvError('Email mismatch in user info from Microsoft Graph /me endpoint', 'OAUTH_VALIDATION_ERROR');
  }
  let auth = await getAuthCode(email, scopes);
  if (!auth.code) {
    throw new MvError('Authorization failed!', 'OUTLOOK_OAUTH_ERROR');
  }
  if (auth.prompt === 'none') {
    // Re-authorize with consent as without prompt the refresh token is empty
    auth = await getAuthCode(email, scopes, 'consent');
  }
  const tokens = await getAuthTokens(auth.code);
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

async function getAuthCode(email, scopes, prompt) {
  const redirectURL = chrome.identity.getRedirectURL();
  const state = getUUID();
  const auth_params = {
    client_id: CLIENT_ID,
    login_hint: email,
    redirect_uri: redirectURL,
    response_type: 'code',
    scope: scopes.join(' '),
    state
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

async function getAuthToken(email, scopes) {
  const redirectURL = chrome.identity.getRedirectURL();
  const state = getUUID();
  const auth_params = {
    client_id: CLIENT_ID,
    login_hint: email,
    redirect_uri: redirectURL,
    response_type: 'token',
    scope: scopes.join(' '),
    state
  };
  const url = `${MICROSOFT_OAUTH_HOST}/authorize?${new URLSearchParams(Object.entries(auth_params))}`;
  const responseURL = await chrome.identity.launchWebAuthFlow({url, interactive: true});
  const search = new URLSearchParams(new URL(responseURL).hash.replace(/^#/, ''));
  if (search.get('state') !== state) {
    throw new Error('oauth2/v2.0/authorize: wrong state parameter');
  }
  return search.get('access_token');
}

async function getAuthTokens(authCode) {
  const url = `${MICROSOFT_OAUTH_HOST}/token`;
  const params = {
    client_id: CLIENT_ID,
    code: authCode,
    client_secret: CLIENT_SECRET,
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
    client_secret: CLIENT_SECRET,
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
