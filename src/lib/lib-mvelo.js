/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mveloGlobal from '../mvelo';
import browser from 'webextension-polyfill';
import dompurify from 'dompurify';

const mvelo = Object.assign({}, mveloGlobal);

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
  return browser.storage.local.remove(id);
};

mvelo.storage.old = {};

mvelo.storage.old.get = function(id) {
  return JSON.parse(window.localStorage.getItem(id));
};

mvelo.storage.old.remove = function(id) {
  window.localStorage.removeItem(id);
};

mvelo.tabs = {};

mvelo.tabs.getActive = function() {
  // get selected tab, "*://*/*" filters out non-http(s)
  return browser.tabs.query({active: true, currentWindow: true, url: "*://*/*"})
  .then(tabs => tabs[0]);
};

mvelo.tabs.attach = function(tab, options) {
  return mvelo.util.sequential(file => browser.tabs.executeScript(tab.id, {file, allFrames: true}), options.contentScriptFile);
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
      return mvelo.tabs.activate(tabs[0], {url: url + hash})
      .then(tab => mvelo.tabs.sendMessage(tab, {event: 'reload-options', hash}));
    }
  });
};

mvelo.util = mvelo.util || {};

// Add a hook to make all links open a new window
// attribution: https://github.com/cure53/DOMPurify/blob/master/demos/hooks-target-blank-demo.html
dompurify.addHook('afterSanitizeAttributes', node => {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
  }
  // set MathML links to xlink:show=new
  if (!node.hasAttribute('target') &&
      (node.hasAttribute('xlink:href') ||
       node.hasAttribute('href'))) {
    node.setAttribute('xlink:show', 'new');
  }
});

mvelo.util.parseHTML = function(html) {
  return dompurify.sanitize(html, {SAFE_FOR_JQUERY: true});
};

mvelo.util.getHostname = function(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.hostname;
};

mvelo.util.getHost = function(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.host;
};

mvelo.windows = {};

mvelo.windows.modalActive = false;

mvelo.windows.openPopup = function(url, {width, height, modal} = {}) {
  return browser.windows.getCurrent()
  .then(current => {
    if (window.navigator.platform.indexOf('Win') >= 0 && height) {
      height += 36;
    }
    const top = height && parseInt(current.top + (current.height - height) / 2);
    const left = width && parseInt(current.left + (current.width - width) / 2);
    return browser.windows.create({url, width, height, top, left, type: 'popup'});
  })
  .then(popup => {
    const browserWindow = new mvelo.windows.BrowserWindow(popup.id);
    let focusChangeHandler;
    if (modal) {
      mvelo.windows.modalActive = true;
      focusChangeHandler = newFocus => {
        if (newFocus !== popup.id && newFocus !== browser.windows.WINDOW_ID_NONE) {
          browser.windows.update(popup.id, {focused: true})
          // error occurs when browser window closed directly
          .catch(() => {});
        }
      };
      browser.windows.onFocusChanged.addListener(focusChangeHandler);
    }
    const removedHandler = removed => {
      if (removed === popup.id) {
        mvelo.windows.modalActive = false;
        if (focusChangeHandler) {
          browser.windows.onFocusChanged.removeListener(focusChangeHandler);
        }
        browser.windows.onRemoved.removeListener(removedHandler);
        browserWindow.onRemove();
      }
    };
    browser.windows.onRemoved.addListener(removedHandler);
    return browserWindow;
  });
};

mvelo.windows.BrowserWindow = class {
  constructor(id) {
    this._id = id;
    this.removeHandler = null;
  }

  activate() {
    browser.windows.update(this._id, {focused: true})
    .catch(() => {});
  }

  close() {
    browser.windows.remove(this._id)
    .catch(() => {});
  }

  addRemoveListener(removeHandler) {
    this.removeHandler = removeHandler;
  }

  onRemove() {
    if (this.removeHandler) {
      this.removeHandler();
    }
  }
};
