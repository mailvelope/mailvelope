/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {encodeHTML} from './util';
import autoLink from './autolink';

const mvelo = {};

export default mvelo;

mvelo.action = {};

mvelo.action.state = function(options) {
  if (typeof options.badge !== 'undefined') {
    chrome.action.setBadgeText({text: options.badge});
  }
  if (typeof options.badgeColor !== 'undefined') {
    chrome.action.setBadgeBackgroundColor({color: options.badgeColor});
  }
};

mvelo.storage = {};

mvelo.storage.get = function(id) {
  return chrome.storage.local.get(id)
  .then(items => items[id]);
};

mvelo.storage.set = function(id, obj) {
  return chrome.storage.local.set({[id]: obj});
};

mvelo.storage.remove = function(id) {
  id = typeof id === 'string' ? [id] : id;
  if (id.length === 1) {
    return chrome.storage.local.remove(id[0]);
  } else {
    return mvelo.storage.get(id[0])
    .then(data => {
      const path = id.slice(1);
      let obj = data;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
      }
      delete obj[path.pop()];
      return mvelo.storage.set(id[0], data);
    });
  }
};

mvelo.tabs = {};

mvelo.tabs.getActive = function(url = '*://*/*') {
  // get selected tab, "*://*/*" filters out non-http(s)
  return chrome.tabs.query({active: true, currentWindow: true, url})
  .then(tabs => tabs[0]);
};

mvelo.tabs.query = function(url) {
  return chrome.tabs.query({url, currentWindow: true})
  .catch(() => []);
};

mvelo.tabs.create = function(url, complete) {
  return new Promise((resolve, reject) => {
    let newTab;
    if (complete) {
      // wait for tab to be loaded
      chrome.tabs.onUpdated.addListener(function updateListener(tabid, info) {
        if (tabid === newTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(updateListener);
          resolve(newTab);
        }
      });
    }
    chrome.tabs.create({url})
    .then(tab => {
      chrome.windows.update(tab.windowId, {focused: true});
      if (complete) {
        newTab = tab;
      } else {
        resolve(tab);
      }
    })
    .catch(e => reject(e));
  });
};

mvelo.tabs.activate = function(tab, options = {}) {
  options.active = true;
  return chrome.tabs.update(tab.id, options);
};

mvelo.tabs.loadAppTab = function(hash = '') {
  return mvelo.tabs.loadTab({path: 'app/app.html', hash});
};

mvelo.tabs.loadTab = function({path = '', hash = ''}) {
  // Check if tab already exists.
  const url = chrome.runtime.getURL(path);
  return mvelo.tabs.query(`${url}*`)
  .then(tabs => {
    if (tabs.length === 0) {
      // if not existent, create tab
      return mvelo.tabs.create(url + hash, false);
    } else {
      // if existent, set as active tab
      return mvelo.tabs.activate(tabs[0], {url: url + hash});
    }
  });
};

mvelo.util = {};

mvelo.util.offscreenCreating = null;

mvelo.util.setupOffscreenDocument = async function() {
  const offscreenUrl = chrome.runtime.getURL('lib/offscreen/offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });
  if (contexts.length > 0) {
    return;
  }
  if (this.offscreenCreating) {
    await this.offscreenCreating;
  } else {
    this.offscreenCreating = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['DOM_PARSER'],
      justification: 'Mailvelope requires offscreen documents to securely filter the content of an email',
    });
    await this.offscreenCreating;
    this.offscreenCreating = null;
  }
};

mvelo.util.sendOffscreenMessage = async function(type, data) {
  await this.setupOffscreenDocument();
  return chrome.runtime.sendMessage({type, target: 'offscreen', data});
};

mvelo.util.sanitizeHTML = async function(html) {
  const saniHtml = await this.sendOffscreenMessage('sanitize-html', html);
  return saniHtml;
};

mvelo.util.text2autoLinkHtml = function(text) {
  return mvelo.util.sanitizeHTML(autoLink(text, {defaultProtocol: 'https', escapeFn: encodeHTML}));
};

mvelo.util.normalizeDomain = function(hostname) {
  // limit to 3 labels per domain
  return hostname.split('.').slice(-3).join('.');
};

mvelo.windows = {};

mvelo.windows.PopupMap = class {
  constructor() {
    this.tabs = new Map();
  }

  set(tabId, windowId, browserWindow) {
    if (this.tabs.has(tabId)) {
      const tab = this.tabs.get(tabId);
      browserWindow.index = tab.size;
      tab.set(windowId, browserWindow);
    } else {
      this.tabs.set(tabId, new Map([[windowId, browserWindow]]));
    }
  }

  delete(tabId, windowId) {
    if (this.tabs.has(tabId)) {
      const tab = this.tabs.get(tabId);
      tab.delete(windowId);
      if (!tab.size) {
        this.tabs.delete(tabId);
      }
    }
  }
};

mvelo.windows.popupMap = new mvelo.windows.PopupMap();

/**
 * Open new browser window
 * @param  {String} url             URL to be loaded in the new window
 * @param  {[type]} options.width   width of the window
 * @param  {[type]} options.height  height of the window
 * @return {BrowserWindow}
 */
mvelo.windows.openPopup = async function(url, {width, height} = {}, tabId) {
  const currentWindow = await chrome.windows.getCurrent({populate: true});
  if (currentWindow.id === chrome.windows.WINDOW_ID_NONE) {
    throw new Error('Browser window does not exist');
  }
  if (!tabId) {
    const activeTab = currentWindow.tabs.find(tab => tab.active);
    tabId = activeTab.id;
  }
  if (navigator.platform.indexOf('Win') >= 0 && height) {
    height += 36;
  }
  const top = height && parseInt(currentWindow.top + (currentWindow.height - height) / 2);
  const left = width && parseInt(currentWindow.left + (currentWindow.width - width) / 2);
  const popup = await chrome.windows.create({url, width, height, top, left, type: 'popup'});
  return new this.BrowserWindow({popup, openerTabId: tabId});
};

mvelo.windows.getPopup = async function(popupId, openerTabId) {
  const popup = await chrome.windows.get(popupId, {windowTypes: ['popup']});
  return new this.BrowserWindow({popup, openerTabId});
};

mvelo.windows.BrowserWindow = class {
  constructor({popup, openerTabId}) {
    // window id of this popup
    this.id = popup.id;
    // tab id of the opener
    this.tabId = openerTabId;
    this.popup = popup;
    this.index = 0;
    this.removeHandler = null;
    mvelo.windows.popupMap.set(this.tabId, this.id, this);
    this._tabActivatedChangeHandler = this._tabActivatedChangeHandler.bind(this);
    this._windowRemovedHandler = this._windowRemovedHandler.bind(this);
    chrome.tabs.onActivated.addListener(this._tabActivatedChangeHandler);
    chrome.windows.onRemoved.addListener(this._windowRemovedHandler);
    chrome.tabs.update(openerTabId, {active: true});
  }

  activate() {
    chrome.tabs.update(this.tabId, {active: true});
    chrome.windows.update(this.id, {focused: true})
    .catch(() => {});
  }

  close() {
    chrome.windows.remove(this.id)
    .catch(() => {});
  }

  _tabActivatedChangeHandler({tabId}) {
    if (tabId === this.tabId) {
      // opener tab gets focus, set focus on us
      const offset = this.index * 40;
      chrome.windows.update(this.id, {focused: true, top: this.popup.top + offset, left: this.popup.left + offset})
      // error occurs when browser window closed directly
      .catch(() => {});
    }
  }

  _windowRemovedHandler(closedWindowId) {
    if (closedWindowId === this.id) {
      mvelo.windows.popupMap.delete(this.tabId, this.id);
      chrome.tabs.onActivated.removeListener(this._tabActivatedChangeHandler);
      chrome.windows.onRemoved.removeListener(this._windowRemovedHandler);
      this._onRemove();
    }
  }

  addRemoveListener(removeHandler) {
    this.removeHandler = removeHandler;
  }

  _onRemove() {
    if (this.removeHandler) {
      this.removeHandler();
    }
  }
};
