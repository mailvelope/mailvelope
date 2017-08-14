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

mvelo.l10n.get = browser.i18n.getMessage;

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

mvelo.tabs.query = function(url, callback) {
  if (!/\*$/.test(url)) {
    url += '*';
  }
  chrome.tabs.query({url, currentWindow: true}, callback);
};

mvelo.tabs.create = function(url, complete, callback) {
  let newTab;
  if (complete) {
    // wait for tab to be loaded
    chrome.tabs.onUpdated.addListener(function updateListener(tabid, info) {
      if (tabid === newTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(updateListener);
        if (callback) {
          callback(newTab);
        }
      }
    });
  }
  chrome.tabs.create({url}, tab => {
    if (complete) {
      newTab = tab;
    } else {
      if (callback) {
        callback(tab);
      }
    }
  });
};

mvelo.tabs.activate = function(tab, options, callback) {
  options = options || {};
  options.active = true;
  chrome.tabs.update(tab.id, options, callback);
};

mvelo.tabs.sendMessage = function(tab, msg, callback) {
  chrome.tabs.sendMessage(tab.id, msg, null, callback);
};

mvelo.tabs.loadOptionsTab = function(hash, callback) {
  // check if options tab already exists
  const url = chrome.runtime.getURL('app/app.html');
  this.query(url, function(tabs) {
    if (tabs.length === 0) {
      // if not existent, create tab
      if (hash === undefined) {
        hash = '';
      }
      mvelo.tabs.create(url + hash, false, function(tab) {
        mvelo.tabs._loadOptionsTabReady = callback.bind(this, false, tab);
      });
    } else {
      // if existent, set as active tab
      mvelo.tabs.activate(tabs[0], {url: url + hash}, callback.bind(this, true));
    }
  });
};

mvelo.tabs.onOptionsTabReady = function() {
  if (mvelo.tabs._loadOptionsTabReady) {
    mvelo.tabs._loadOptionsTabReady();
    mvelo.tabs._loadOptionsTabReady = null;
  }
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

mvelo.util.parseHTML = function(html, callback) {
  callback(dompurify.sanitize(html, {SAFE_FOR_JQUERY: true}));
};

// must be bound to window, otherwise illegal invocation
mvelo.util.setTimeout = window.setTimeout.bind(window);
mvelo.util.clearTimeout = window.clearTimeout.bind(window);

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

mvelo.util.getDOMWindow = function() {
  return window;
};

mvelo.util.fetch = window.fetch.bind(window);

mvelo.windows = {};

mvelo.windows.modalActive = false;

mvelo.windows.openPopup = function(url, options, callback) {
  chrome.windows.getCurrent(null, current => {
    if (window.navigator.platform.indexOf('Win') >= 0 && options.height) {
      options.height += 36;
    }
    chrome.windows.create({
      url,
      width: options && options.width,
      height: options && options.height,
      top: options && parseInt(current.top + (current.height - options.height) / 2),
      left: options && parseInt(current.left + (current.width - options.width) / 2),
      type: 'popup'
    }, popup => {
      //console.log('popup created', popup);
      if (options && options.modal) {
        mvelo.windows.modalActive = true;
        const focusChangeHandler = function(newFocus) {
          //console.log('focus changed', newFocus);
          if (newFocus !== popup.id && newFocus !== chrome.windows.WINDOW_ID_NONE) {
            chrome.windows.update(popup.id, {focused: true});
          }
        };
        chrome.windows.onFocusChanged.addListener(focusChangeHandler);
        const removedHandler = function(removed) {
          //console.log('removed', removed);
          if (removed === popup.id) {
            //console.log('remove handler');
            mvelo.windows.modalActive = false;
            chrome.windows.onFocusChanged.removeListener(focusChangeHandler);
            chrome.windows.onRemoved.removeListener(removedHandler);
          }
        };
        chrome.windows.onRemoved.addListener(removedHandler);
      }
      if (callback) {
        callback(new mvelo.windows.BrowserWindow(popup.id));
      }
    });
  });
};

mvelo.windows.BrowserWindow = function(id) {
  this._id = id;
};

mvelo.windows.BrowserWindow.prototype.activate = function() {
  chrome.windows.update(this._id, {focused: true});
};

mvelo.windows.BrowserWindow.prototype.close = function() {
  chrome.windows.remove(this._id);
};
