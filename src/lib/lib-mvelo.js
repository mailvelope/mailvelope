/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import browser from 'webextension-polyfill';
import {encodeHTML} from './util';
import dompurify from 'dompurify';
import autoLink from './autolink';

const mvelo = {};

export default mvelo;

mvelo.browserAction = {};

mvelo.browserAction.state = function(options) {
  if (typeof options.badge !== 'undefined') {
    browser.browserAction.setBadgeText({text: options.badge});
  }
  if (typeof options.badgeColor !== 'undefined') {
    browser.browserAction.setBadgeBackgroundColor({color: options.badgeColor});
  }
};

mvelo.data = {};

mvelo.data.load = function(path) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', browser.runtime.getURL(path));
    req.responseType = 'text';
    req.onload = function() {
      if (req.status == 200) {
        resolve(req.response);
      } else {
        reject(new Error(req.statusText));
      }
    };
    req.onerror = function() {
      reject(new Error('Network Error'));
    };
    req.send();
  });
};

mvelo.storage = {};

mvelo.storage.get = function(id) {
  return browser.storage.local.get(id)
  .then(items => items[id]);
};

mvelo.storage.set = function(id, obj) {
  return browser.storage.local.set({[id]: obj});
};

mvelo.storage.remove = function(id) {
  id = typeof id === 'string' ? [id] : id;
  if (id.length === 1) {
    return browser.storage.local.remove(id[0]);
  } else {
    return mvelo.storage.get(id[0])
    .then(data => {
      const path = id.slice(1);
      let obj = data;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
      }
      delete obj[path.pop()];
      mvelo.storage.set(id[0], data);
    });
  }
};

mvelo.tabs = {};

mvelo.tabs.getActive = function() {
  // get selected tab, "*://*/*" filters out non-http(s)
  return browser.tabs.query({active: true, currentWindow: true, url: '*://*/*'})
  .then(tabs => tabs[0]);
};

mvelo.tabs.attach = function(tabId, options) {
  return browser.tabs.executeScript(tabId, options)
  .catch(() => []);
};

mvelo.tabs.query = function(url) {
  return browser.tabs.query({url, currentWindow: true})
  .catch(() => []);
};

mvelo.tabs.create = function(url, complete) {
  return new Promise((resolve, reject) => {
    let newTab;
    if (complete) {
      // wait for tab to be loaded
      browser.tabs.onUpdated.addListener(function updateListener(tabid, info) {
        if (tabid === newTab.id && info.status === 'complete') {
          browser.tabs.onUpdated.removeListener(updateListener);
          resolve(newTab);
        }
      });
    }
    browser.tabs.create({url})
    .then(tab => {
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
  return browser.tabs.update(tab.id, options);
};

mvelo.tabs.sendMessage = function(tab, msg) {
  return browser.tabs.sendMessage(tab.id, msg);
};

mvelo.tabs.loadAppTab = function(hash = '') {
  return mvelo.tabs.loadTab({path: 'app/app.html', hash});
};

mvelo.tabs.loadTab = function({path = '', hash = ''}) {
  // Check if tab already exists.
  const url = browser.runtime.getURL(path);
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

// Add a hook to make all links open a new window
// attribution: https://github.com/cure53/DOMPurify/blob/master/demos/hooks-target-blank-demo.html
dompurify.addHook('afterSanitizeAttributes', node => {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noreferrer noopener');
  }
  // set MathML links to xlink:show=new
  if (!node.hasAttribute('target') &&
      (node.hasAttribute('xlink:href') ||
       node.hasAttribute('href'))) {
    node.setAttribute('xlink:show', 'new');
  }
});

mvelo.util.sanitizeHTML = function(html) {
  return dompurify.sanitize(html, {SAFE_FOR_JQUERY: true});
};

mvelo.util.text2autoLinkHtml = function(text) {
  return mvelo.util.sanitizeHTML(autoLink(text, {defaultProtocol: 'https', escapeFn: encodeHTML}));
};

mvelo.util.getHostname = function(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.hostname;
};

mvelo.util.getProtocol = function(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.protocol.replace(/:/g, '');
};

mvelo.util.getDomain = function(url) {
  const hostname = mvelo.util.getHostname(url);
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
mvelo.windows.openPopup = function(url, {width, height} = {}) {
  let activeTab;
  return browser.windows.getCurrent({populate: true})
  .then(currentWindow => {
    if (currentWindow.id === browser.windows.WINDOW_ID_NONE) {
      throw new Error('Browser window does not exist');
    }
    activeTab = currentWindow.tabs.find(tab => tab.active);
    if (window.navigator.platform.indexOf('Win') >= 0 && height) {
      height += 36;
    }
    const top = height && parseInt(currentWindow.top + (currentWindow.height - height) / 2);
    const left = width && parseInt(currentWindow.left + (currentWindow.width - width) / 2);
    return browser.windows.create({url, width, height, top, left, type: 'popup'});
  })
  .then(popup => new this.BrowserWindow({popup, openerTabId: activeTab.id}));
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
    browser.tabs.onActivated.addListener(this._tabActivatedChangeHandler);
    browser.windows.onRemoved.addListener(this._windowRemovedHandler);
  }

  activate() {
    browser.windows.update(this.id, {focused: true})
    .catch(() => {});
  }

  close() {
    browser.windows.remove(this.id)
    .catch(() => {});
  }

  _tabActivatedChangeHandler({tabId}) {
    if (tabId === this.tabId) {
      // opener tab gets focus, set focus on us
      const offset = this.index * 40;
      browser.windows.update(this.id, {focused: true, top: this.popup.top + offset, left: this.popup.left + offset})
      // error occurs when browser window closed directly
      .catch(() => {});
    }
  }

  _windowRemovedHandler(closedWindowId) {
    if (closedWindowId === this.id) {
      mvelo.windows.popupMap.delete(this.tabId, this.id);
      browser.tabs.onActivated.removeListener(this._tabActivatedChangeHandler);
      browser.windows.onRemoved.removeListener(this._windowRemovedHandler);
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
