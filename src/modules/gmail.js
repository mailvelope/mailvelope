/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import browser from 'webextension-polyfill';
import {goog} from './closure-library/closure/goog/emailaddress';
import mvelo from '../lib/lib-mvelo';
import {MvError, deDup, str2ab, ab2hex} from '../lib/util';
import {getUUID, base64EncodeUrl, base64DecodeUrl, byteCount, dataURL2str} from '../lib/util';
import {buildMailWithHeader, filterBodyParts} from './mime';
import * as mailreader from '../lib/mail-reader';

const CLIENT_ID = browser.runtime.getManifest().oauth2.client_id;
const CLIENT_SECRET = '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';
const GOOGLE_API_HOST = 'https://accounts.google.com';
const GOOGLE_OAUTH_STORE = 'mvelo.oauth.gmail';
export const GMAIL_SCOPE_USER_EMAIL = 'https://www.googleapis.com/auth/userinfo.email';
export const GMAIL_SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
export const GMAIL_SCOPE_SEND = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_SCOPES_DEFAULT = ['openid', GMAIL_SCOPE_USER_EMAIL];
const MVELO_BILLING_API_HOST = 'https://license.mailvelope.com';

export const MAIL_QUOTA = 25 * 1024 * 1024;

export async function getMessage({msgId, email, accessToken, format = 'full', metaHeaders = []}) {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    contentType: 'json'
  };
  return fetchJSON(
    `https://www.googleapis.com/gmail/v1/users/${email}/messages/${msgId}?format=${format}${metaHeaders.map(header => `&metadataHeaders=${header}`).join('')}`,
    options
  );
}

export async function getMessageMimeType({msgId, email, accessToken}) {
  const {payload} = await getMessage({msgId, email, accessToken, format: 'metadata', metaHeaders: ['content-type']});
  const contentType = extractMailHeader(payload, 'Content-Type');
  const {protocol} = parseQuery(contentType, ';');
  return {mimeType: payload.mimeType, protocol};
}

export async function getAttachment({email, msgId, attachmentId, fileName, accessToken}) {
  if (!attachmentId) {
    const msg = await getMessage({msgId, email, accessToken});
    ({body: {attachmentId}} = msg.payload.parts.find(part => part.filename === fileName));
  }
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    contentType: 'json'
  };
  const {data, size} = await fetchJSON(
    `https://www.googleapis.com/gmail/v1/users/${email}/messages/${msgId}/attachments/${attachmentId}`,
    options
  );
  return {data: `data:application/octet-stream;base64,${base64DecodeUrl(data)}`, size, mimeType: 'application/octet-stream'};
}

export async function sendMessage({email, message, accessToken}) {
  const options = {
    method: 'POST',
    body: message,
    mode: 'cors',
    headers: {
      'Content-Type': 'message/rfc822',
      'Content-Length': byteCount(message),
      Authorization: `Bearer ${accessToken}`,
    }
  };
  return fetchJSON(
    `https://www.googleapis.com/upload/gmail/v1/users/${email}/messages/send?uploadType=media`,
    options
  );
}

export async function sendMessageMeta({email, message, threadId, accessToken}) {
  const data = {
    raw: base64EncodeUrl(btoa(message))
  };
  if (threadId) {
    data.threadId = threadId;
  }
  const options = {
    method: 'POST',
    body: JSON.stringify(data),
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Authorization: `Bearer ${accessToken}`,
    }
  };
  return fetchJSON(
    ` https://www.googleapis.com/gmail/v1/users/${email}/messages/send`,
    options
  );
}

export async function getAccessToken({email, scopes = []}) {
  scopes = deDup([...GMAIL_SCOPES_DEFAULT, ...scopes]);
  const storedTokens = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
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
  return storedData.access_token && (storedData.access_token_exp  >= new Date().getTime());
}

function validateLicense(storedData) {
  const date = new Date();
  return Boolean(storedData.mvelo_license_issued) && (new Date(date.getUTCFullYear(), date.getUTCMonth()).getTime() === storedData.mvelo_license_issued);
}

export async function checkLicense({email, legacyGsuite}) {
  const storedAuthData = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  const storedData = storedAuthData[email];
  if (!storedData.gsuite) {
    return;
  }
  if (legacyGsuite && storedData.legacyGsuite) {
    return;
  }
  if (validateLicense(storedData)) {
    return;
  }
  const {gsuite, gmail_account_id} = storedData;
  let valid = false;
  try {
    await requestLicense(gsuite, gmail_account_id);
    valid = true;
  } catch (e) {
    if (!legacyGsuite) {
      throw new MvError(`Mailvelope Business license required to use this feature. ${e.message}`, 'GSUITE_LICENSING_ERROR');
    }
  } finally {
    await storeAuthData(email, {...buildLicenseData(valid), legacyGsuite});
  }
}

async function requestLicense(domain, gmail_account_id) {
  const ab = str2ab(gmail_account_id);
  const abHash = await window.crypto.subtle.digest('SHA-256', ab);
  const hexHash = ab2hex(abHash);
  const url = `${MVELO_BILLING_API_HOST}/api/v1/getLicense`;
  const data = {
    domain,
    user: hexHash
  };
  const result = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (result.status !== 200) {
    const reply = await result.text();
    throw new Error(reply);
  }
}

export async function authorize(email, legacyGsuite, scopes = browser.runtime.getManifest().oauth2.scopes) {
  scopes = deDup([...GMAIL_SCOPES_DEFAULT, ...scopes]);
  // incremental authorization to prevent checkboxes for the requested scopes on the consent screen
  const access_token = await getAuthToken(email, GMAIL_SCOPES_DEFAULT);
  const userInfo = await getUserInfo(access_token);
  if (userInfo.email !== email) {
    throw new MvError('Email mismatch in user info from oauth2/v3/userinfo', 'OAUTH_VALIDATION_ERROR');
  }
  let auth = await getAuthCode(email, scopes);
  if (!auth.code) {
    throw new MvError('Authorization failed!', 'GOOGLE_OAUTH_ERROR');
  }
  if (auth.prompt === 'none') {
    // re-authorize with consent as without prompt the refresh token is empty
    auth = await getAuthCode(email, scopes, 'consent');
  }
  const tokens = await getAuthTokens(auth.code);
  await storeAuthData(email, buildAuthMeta({...userInfo, ...tokens, legacyGsuite}));
  return tokens.access_token;
}

export async function unauthorize(email) {
  const authMetaData = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
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
  await mvelo.storage.set(GOOGLE_OAUTH_STORE, authMetaData);
}

async function getAuthCode(email, scopes = browser.runtime.getManifest().oauth2.scopes, prompt) {
  const redirectURL = browser.identity.getRedirectURL();
  const state = getUUID();
  const auth_params = {
    access_type: 'offline',
    client_id: CLIENT_ID,
    include_granted_scopes: true,
    login_hint: email,
    redirect_uri: redirectURL,
    response_type: 'code',
    scope: scopes.join(' '),
    state
  };
  if (prompt) {
    auth_params.prompt = prompt;
  }
  const url = `${GOOGLE_API_HOST}/o/oauth2/v2/auth?${new URLSearchParams(Object.entries(auth_params))}`;
  const responseURL = await browser.identity.launchWebAuthFlow({url, interactive: true});
  const search = new URL(responseURL).searchParams;
  if (search.get('state') !== state) {
    throw new Error('oauth2/v2/auth: wrong state parameter');
  }
  return {
    code: search.get('code'),
    prompt: search.get('prompt')
  };
}

async function getAuthToken(email, scopes = browser.runtime.getManifest().oauth2.scopes) {
  const redirectURL = browser.identity.getRedirectURL();
  const state = getUUID();
  const auth_params = {
    client_id: CLIENT_ID,
    include_granted_scopes: true,
    login_hint: email,
    redirect_uri: redirectURL,
    response_type: 'token',
    scope: scopes.join(' '),
    state
  };
  const url = `${GOOGLE_API_HOST}/o/oauth2/v2/auth?${new URLSearchParams(Object.entries(auth_params))}`;
  const responseURL = await browser.identity.launchWebAuthFlow({url, interactive: true});
  const search = new URLSearchParams(new URL(responseURL).hash.replace(/^#/, ''));
  if (search.get('state') !== state) {
    throw new Error('oauth2/v2/auth: wrong state parameter');
  }
  return search.get('access_token');
}

async function getAuthTokens(authCode) {
  const url = 'https://oauth2.googleapis.com/token';
  const params = {
    client_id: CLIENT_ID,
    code: authCode,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: browser.identity.getRedirectURL()
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
  const url = 'https://oauth2.googleapis.com/token';
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

async function getUserInfo(accessToken) {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    contentType: 'json'
  };
  const {sub, hd, email} = await fetchJSON('https://www.googleapis.com/oauth2/v3/userinfo', options);
  return {sub, hd, email};
}

async function revokeToken(token) {
  let url = `${GOOGLE_API_HOST}/o/oauth2/revoke`;
  url += `?token=${encodeURIComponent(token)}`;
  const result = await fetch(url);
  console.log('Revoke token', result.ok);
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
  if (token.hd) {
    data.gsuite = token.hd;
    data.gmail_account_id = token.sub;
    if (token.legacyGsuite) {
      data.legacyGsuite = token.legacyGsuite;
    }
  }
  return data;
}

function buildLicenseData(valid) {
  const data = {
    mvelo_license_issued: 0
  };
  if (valid) {
    const date = new Date();
    data.mvelo_license_issued = new Date(date.getUTCFullYear(), date.getUTCMonth()).getTime();
  }
  return data;
}

async function storeAuthData(email, data) {
  let entries = await mvelo.storage.get(GOOGLE_OAUTH_STORE);
  if (entries) {
    entries[email] = {...entries[email], ...data};
  } else {
    entries = {[email]: data};
  }
  return mvelo.storage.set(GOOGLE_OAUTH_STORE, entries);
}

async function fetchJSON(resource, options) {
  const response = await fetch(resource, options);
  const json = await response.json();
  if (!response.ok) {
    throw new MvError(json.error_description ?? json.error?.message, 'GMAIL_API_ERROR');
  }
  return json;
}

function parseQuery(queryString, separator = '&') {
  const query = {};
  const pairs = (queryString[0] === '?' ? queryString.slice(1) : queryString).split(separator);
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0].trim())] = decodeURIComponent((pair[1] || '').replace(/^"(.+(?="$))"$/, '$1'));
  }
  return query;
}

export function extractMailHeader(payload, name) {
  const header = payload.headers.find(header => name.localeCompare(header.name, undefined, {sensitivity: 'base'}) === 0);
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
  let body;
  if (/^multipart\/signed/i.test(payload.mimeType) && payload.parts && payload.parts[1]) {
    if (/^application\/pgp-signature/i.test(payload.parts[1].mimeType)) {
      const node = getMimeNode(payload.parts);
      if (node) {
        body = node.body;
      }
    }
  } else {
    const node = getMimeNode([payload], [type]);
    if (node) {
      body = node.body;
    }
  }
  if (!body) {
    return '';
  }
  if (body.data) {
    return atob(base64DecodeUrl(body.data));
  }
  if (body.attachmentId) {
    const {data} = await this.getAttachment({email: userEmail, msgId, attachmentId: body.attachmentId, accessToken});
    return dataURL2str(data);
  }
}

export function extractSignedClearTextMultipart(rawEncoded) {
  const raw = atob(base64DecodeUrl(rawEncoded));
  const parsed = mailreader.parse([{raw}]);
  const [result] = filterBodyParts(parsed, 'signed');
  if (result) {
    const [{content: message}] = filterBodyParts([result], 'text');
    return {signedMessage: result.signedMessage, message};
  }
}

export async function getPGPSignatureAttId({msgId, email, accessToken}) {
  const {payload} = await getMessage({msgId, email, accessToken});
  const node = getMimeNode([payload], ['multipart/signed']);
  if (node) {
    const sigNode = getMimeNode(node.parts, ['application/pgp-signature']);
    return sigNode.body.attachmentId;
  }
}

export async function getPGPEncryptedAttData({msgId, email, accessToken}) {
  const {payload} = await getMessage({msgId, email, accessToken});
  const node = getMimeNode([payload], ['multipart/encrypted']);
  if (node) {
    const encNode = getMimeNode(node.parts, ['application/octet-stream']);
    return {attachmentId: encNode.body.attachmentId, fileName: encNode.filename};
  }
}

export function getMailAttachments({payload, userEmail, msgId, exclude = ['encrypted.asc', 'signature.asc'], accessToken}) {
  if (!payload.parts) {
    return [];
  }
  return Promise.all(payload.parts.filter(({body: {attachmentId}, filename}) => attachmentId && filename && !exclude.includes(filename)).map(async part => {
    const filename = part.filename;
    const attachment = await getAttachment({email: userEmail, msgId, attachmentId: part.body.attachmentId, filename, accessToken});
    return {filename: decodeURI(filename), ...attachment};
  }));
}

export function getMimeNode(parts, mimeTypes = ['text/plain']) {
  let node;
  for (const part of parts) {
    if (mimeTypes.includes(part.mimeType)) {
      node = part;
    }
    if (!node && part.parts) {
      node = getMimeNode(part.parts, mimeTypes);
    }
    if (node) {
      return node;
    }
  }
}

export function parseEmailAddress(address) {
  const emailAddress = goog.format.EmailAddress.parse(address);
  if (!emailAddress.isValid()) {
    throw new Error('Parsing email address failed.');
  }
  return {email: emailAddress.getAddress(), name: emailAddress.getName()};
}

export function buildMail({message, attachments, subject, sender, to, cc}) {
  const mail = buildMailWithHeader({message, attachments, subject, sender, to, cc, quota: MAIL_QUOTA, continuationEncode: false});
  if (mail === null) {
    throw new Error('MIME building failed.');
  }
  return mail;
}
