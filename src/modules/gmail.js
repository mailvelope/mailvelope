/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import browser from 'webextension-polyfill';
import {matchPattern2RegExString, getHash} from '../lib/util';

const CLIENT_ID = '373196800931-ce39g4o9hshkhnot9im7m1bga57lvhlt.apps.googleusercontent.com';
const GOOGLE_API_HOST = 'https://accounts.google.com';
const GOOGLE_OAUTH_STORE = 'mvelo.oauth.gmail';
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/userinfo.email'];
const API_KEY = 'AIzaSyDmDlrIRgj3YEtLm-o4rA8qXG8b17bWfIs';

export async function getMessage({msgId, email}) {
  console.log('Fetching message: ', msgId);
  const scopes = [...DEFAULT_SCOPES, 'https://www.googleapis.com/auth/gmail.readonly'];
  const accessToken = await getAccessToken(email, scopes);
  const tokenInfo = await getTokenInfo(accessToken, 'access');
  console.log('Access token info: ', tokenInfo);
  console.log('Using access token: ', accessToken);
  const init = {
    method: 'GET',
    async: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Accept': 'application/json'
    },
    'contentType': 'json'
  };
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/${email}/messages/${msgId}?key=${API_KEY}`,
    init
  );
  console.log(response);
  const data = await response.json();
  console.log(data);
}

async function getAccessToken(email, scopes) {
  console.log('Getting access token...');
  const storedTokens = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  console.log('Stored tokens: ', storedTokens);
  if (storedTokens && Object.keys(storedTokens).includes(email) && scopes.every(scope => storedTokens[email].scope.split(' ').includes(scope))) {
    console.log('Token found: ', storedTokens[email]);
    const storedToken = storedTokens[email];
    if (checkTokenValidity(storedToken)) {
      console.log('Token valid! Returning...');
      return storedToken.access_token;
    }
    if (storedToken.refresh_token) {
      console.log('Refreshing token...');
      const refreshedToken = await getRrefeshToken(storedToken.refresh_token);
      if (refreshedToken.access_token) {
        console.log('Storing refreshed token: ', refreshedToken);
        await storeToken(email, refreshedToken);
        return refreshedToken.access_token;
      }
    }
  }
  console.log('New authorisation required!');
  return authorize(email, scopes);
}

function checkTokenValidity(storedToken) {
  return storedToken.access_token && (storedToken.access_token_exp  >= new Date().getTime());
}

async function authorize(email, scopes) {
  try {
    const authCode = await getAuthCode(email, scopes);
    console.log('Authorisation code retrieved: ', authCode);
    const token = await getAuthTokens(authCode);
    console.log('Authorisation tokens retrieved: ', token);
    const id = parseJwt(token.id_token);
    console.log('Id token info: ', id);
    if (id.iss === GOOGLE_API_HOST && id.aud === CLIENT_ID && id.email === email && id.exp >= (new Date().getTime() / 1000)) {
      await storeToken(email, token);
      console.log('Token info stored for: ', email);
      return token.access_token;
    }
  } catch (e) {
    console.error(e.message);
  }
}

export async function unauthorize(email) {
  console.log('Unauthorizing email: ', email);
  const storedTokens = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  if (!storedTokens || !storedTokens[email]) {
    return;
  }
  await revokeToken(storedTokens[email].access_token);
  delete storedTokens[email];
  mvelo.storage.set(GOOGLE_OAUTH_STORE, storedTokens);
}

async function getAuthCode(email, scopes) {
  const redirectURL = 'urn:ietf:wg:oauth:2.0:oob';
  const response_type = 'code';
  const state = `mv-${getHash()}`;
  let url = `${GOOGLE_API_HOST}/o/oauth2/auth`;
  url += `?client_id=${CLIENT_ID}`;
  url += `&response_type=${response_type}`;
  url += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
  url += `&scope=${encodeURIComponent(scopes.join(' '))}`;
  url += '&access_type=offline';
  url += `&login_hint=${encodeURIComponent(email)}`;
  url += `&state=${encodeURIComponent(state)}`;
  const authPopup = await mvelo.windows.openPopup(url, {width: 500, height: 650});
  const originAndPathMatches = `^${matchPattern2RegExString(GOOGLE_API_HOST)}/.*`;
  return new Promise((resolve, reject) => {
    try {
      browser.webNavigation.onDOMContentLoaded.addListener(({tabId, url}) => {
        chrome.tabs.get(tabId, tab => {
          if (tab.windowId === authPopup.id) {
            if (/\/approval\//.test(url)) {
              if (tab.title.includes(state)) {
                const params = parseQuery(tab.title);
                browser.windows.remove(tab.windowId);
                resolve(params.code);
              } else {
                throw new Error('Wrong state parameter!');
              }
            }
          }
        });
      }, {url: [{originAndPathMatches}]});
    } catch (e) {
      reject(e);
    }
  });
}

async function getAuthTokens(authCode) {
  const redirectURL = 'urn:ietf:wg:oauth:2.0:oob';
  const url = 'https://www.googleapis.com/oauth2/v4/token';
  let data = `code=${encodeURIComponent(authCode)}&`;
  data += `client_id=${encodeURIComponent(CLIENT_ID)}&`;
  data += `redirect_uri=${encodeURIComponent(redirectURL)}&`;
  data += 'grant_type=authorization_code';

  const result = await fetch(url, {
    method: 'POST',
    async: true,
    body: data,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return result.json();
}

async function getRrefeshToken(refresh_token) {
  const url = 'https://www.googleapis.com/oauth2/v4/token';
  let data = `refresh_token=${encodeURIComponent(refresh_token)}&`;
  data += `client_id=${encodeURIComponent(CLIENT_ID)}&`;
  data += 'grant_type=refresh_token';

  const result = await fetch(url, {
    method: 'POST',
    async: true,
    body: data,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return result.json();
}

async function getTokenInfo(token, type = 'id') {
  let url = 'https://www.googleapis.com/oauth2/v3/tokeninfo';
  url += `?${type}_token=${encodeURIComponent(token)}`;
  const result = await fetch(url, {
    async: true
  });
  return result.json();
}

async function revokeToken(token) {
  let url = `${GOOGLE_API_HOST}/o/oauth2/revoke`;
  url += `?token=${encodeURIComponent(token)}`;
  const result = await fetch(url, {
    async: true
  });
  return result.json();
}

async function storeToken(email, token) {
  let entry = {
    [email]: {
      access_token: token.access_token,
      access_token_exp: new Date().getTime() + (token.expires_in) * 1000,
      scope: token.scope,
    }
  };
  if (token.refresh_token) {
    entry[email].refresh_token = token.refresh_token;
  }
  const googleOAuthData = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  if (googleOAuthData) {
    entry = Object.assign(googleOAuthData, entry);
  }
  return mvelo.storage.set(GOOGLE_OAUTH_STORE, entry);
}

function parseQuery(queryString) {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
    `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
  ).join(''));
  return JSON.parse(jsonPayload);
}
