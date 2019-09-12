/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import browser from 'webextension-polyfill';
import {goog} from './closure-library/closure/goog/emailaddress';
import mvelo from '../lib/lib-mvelo';
import {deDup} from '../lib/util';
import {matchPattern2RegExString, getHash, base64EncodeUrl, base64DecodeUrl, byteCount, dataURL2str} from '../lib/util';
import {setAppDataSlot} from '../controller/sub.controller';
import {buildMailWithHeader} from './mime';

const CLIENT_ID = '373196800931-ce39g4o9hshkhnot9im7m1bga57lvhlt.apps.googleusercontent.com';
const GOOGLE_API_HOST = 'https://accounts.google.com';
const GOOGLE_OAUTH_STORE = 'mvelo.oauth.gmail';
export const GMAIL_SCOPE_USER_EMAIL = 'https://www.googleapis.com/auth/userinfo.email';
export const GMAIL_SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
export const GMAIL_SCOPE_SEND = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_SCOPES_DEFAULT = [GMAIL_SCOPE_USER_EMAIL];

const API_KEY = 'AIzaSyDmDlrIRgj3YEtLm-o4rA8qXG8b17bWfIs';
export const MAIL_QUOTA = 25000000;

export async function getMessage({msgId, email, accessToken, format = 'full'}) {
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
    `https://www.googleapis.com/gmail/v1/users/${email}/messages/${msgId}?format=${format}&key=${API_KEY}`,
    init
  );
  return response.json();
}

export async function getAttachment({email, msgId, attachmentId, fileName, accessToken}) {
  if (!attachmentId) {
    const msg = await getMessage({msgId, email, accessToken});
    ({body: {attachmentId}} = msg.payload.parts.find(part => part.filename === fileName));
  }
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
    `https://www.googleapis.com/gmail/v1/users/${email}/messages/${msgId}/attachments/${attachmentId}?key=${API_KEY}`,
    init
  );
  const {data, size} = await response.json();
  return {data: `data:application/octet-stream;base64,${base64DecodeUrl(data)}`, size, mimeType: 'application/octet-stream'};
}

export async function sendMessage({email, message, accessToken}) {
  const init = {
    method: 'POST',
    async: true,
    body: message,
    mode: 'cors',
    headers: {
      'Content-Type': 'message/rfc822',
      'Content-Length': byteCount(message),
      'Authorization': `Bearer ${accessToken}`,
    }
  };
  const result = await fetch(
    `https://www.googleapis.com/upload/gmail/v1/users/${email}/messages/send?uploadType=media`,
    init
  );
  return result.json();
}

export async function sendMessageMeta({email, message, threadId, accessToken}) {
  const data = {
    raw: base64EncodeUrl(btoa(message))
  };
  if (threadId) {
    data.threadId = threadId;
  }
  const init = {
    method: 'POST',
    async: true,
    body: JSON.stringify(data),
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': `Bearer ${accessToken}`,
    }
  };
  const result = await fetch(
    ` https://www.googleapis.com/gmail/v1/users/${email}/messages/send`,
    init
  );
  return result.json();
}

export async function getAccessToken(email, scopes = []) {
  scopes = deDup([...GMAIL_SCOPES_DEFAULT, ...scopes]);
  const storedTokens = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  if (storedTokens && Object.keys(storedTokens).includes(email) && scopes.every(scope => storedTokens[email].scope.split(' ').includes(scope))) {
    const storedToken = storedTokens[email];
    if (checkStoredToken(storedToken)) {
      return storedToken.access_token;
    }
    if (storedToken.refresh_token) {
      const refreshedToken = await getRrefeshToken(storedToken.refresh_token);
      if (refreshedToken.access_token) {
        await storeToken(email, refreshedToken);
        return refreshedToken.access_token;
      }
    }
  }
  return;
}

function checkStoredToken(storedToken) {
  return storedToken.access_token && (storedToken.access_token_exp  >= new Date().getTime());
}

export async function authorize(email, scopes = []) {
  scopes = deDup([...GMAIL_SCOPES_DEFAULT, ...scopes]);
  const authCode = await getAuthCode(email, scopes);
  if (!authCode) {
    throw new Error('Authorisation failed!');
  }
  const token = await getAuthTokens(authCode);
  const id = parseJwt(token.id_token);
  if (id.iss === GOOGLE_API_HOST && id.aud === CLIENT_ID && id.email === email && id.exp >= (new Date().getTime() / 1000)) {
    await storeToken(email, token);
    return token.access_token;
  }
  return;
}

export async function openAuthorizeDialog({email, scopes, ctrlId}) {
  const slotId = getHash();
  setAppDataSlot(slotId, {email, scopes, ctrlId});
  mvelo.tabs.loadAppTab(`?slotId=${slotId}#/settings/provider/auth`);
}

export async function unauthorize(email) {
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
  url += '&include_granted_scopes=true';
  url += '&prompt=consent';
  url += `&login_hint=${encodeURIComponent(email)}`;
  url += `&state=${encodeURIComponent(state)}`;
  const authPopup = await mvelo.windows.openPopup(url, {width: 500, height: 650});
  const originAndPathMatches = `^${matchPattern2RegExString(GOOGLE_API_HOST)}/.*`;
  return new Promise((resolve, reject) => {
    try {
      browser.webNavigation.onDOMContentLoaded.addListener(function handler({tabId, url}) {
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
              browser.webNavigation.onDOMContentLoaded.removeListener(handler);
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

export async function getTokenInfo(token, type = 'id') {
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

export function extractMailHeader(payload, name) {
  const header = payload.headers.find(header => header.name === name);
  if (header) {
    return header.value;
  }
  return '';
}

export async function extractMailBody({payload, userEmail, msgId, accessToken, type = 'text/plain'}) {
  if (/^multipart\/encrypted/i.test(payload.mimeType) && payload.parts && payload.parts[1]) {
    const attachmentId = payload.parts[1].body.attachmentId;
    const {data: attachment} = await getAttachment({email: userEmail, msgId, attachmentId, accessToken});
    return dataURL2str(attachment);
  }
  if (/^multipart\/signed/i.test(payload.mimeType) && payload.parts && payload.parts[1]) {
    if (/^application\/pgp-signature/i.test(payload.parts[1].mimeType)) {
      return atob(base64DecodeUrl(getMailPartBody(payload.parts[0])));
    }
  }
  const body = getMailPartBody([payload], type);
  if (body.data) {
    return atob(base64DecodeUrl(body.data));
  }
  if (body.attachmentId) {
    const {data} = await this.getAttachment({email: userEmail, msgId, attachmentId: body.attachmentId, accessToken});
    return dataURL2str(data);
  }
  return atob(base64DecodeUrl(getMailPartBody([payload], type)));
}

export function getMailAttachments({payload, userEmail, msgId, exclude = ['encrypted.asc'], accessToken}) {
  if (!payload.parts) {
    return [];
  }
  return Promise.all(payload.parts.filter(({body: {attachmentId}, filename}) => attachmentId && filename && !exclude.includes(filename)).map(async part => {
    const filename = part.filename;
    const attachment = await getAttachment({email: userEmail, msgId, attachmentId: part.body.attachmentId, filename, accessToken});
    return {filename: decodeURI(filename), ...attachment};
  }));
}

export function getMailPartBody(parts, mimeType = 'text/plain') {
  for (const part of parts) {
    if (!part.parts) {
      if (part.mimeType === mimeType) {
        return part.body;
      }
    } else {
      return getMailPartBody(part.parts);
    }
  }
  return '';
}

export function extractMailFromAddress(address) {
  const emailAddress = goog.format.EmailAddress.parse(address);
  if (emailAddress.isValid()) {
    return emailAddress.getAddress();
  }
  return '';
}

export function buildMail({message, attachments, subject, sender, to, cc}) {
  const mail = buildMailWithHeader({message, attachments, subject, sender, to, cc, quota: MAIL_QUOTA, continuationEncode: false});
  if (mail === null) {
    throw new Error('MIME building failed.');
  }
  return mail;
}
