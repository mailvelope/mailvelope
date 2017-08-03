/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';


var mvelo = require('../../mvelo');

mvelo.crx = true;
mvelo.ffa = false;

var dompurify = require('dompurify');

mvelo.data = {};

mvelo.data.url = function(path) {
  return chrome.runtime.getURL(path);
};

mvelo.data.load = function(path) {
  return new Promise((resolve, reject) => {
    var req = new XMLHttpRequest();
    req.open('GET', chrome.runtime.getURL(path));
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

mvelo.tabs = {};

mvelo.tabs.getActive = function(callback) {
  // get selected tab, "*://*/*" filters out non-http(s)
  chrome.tabs.query({active: true, currentWindow: true, url: "*://*/*"}, tabs => {
    callback(tabs[0]);
  });
};

mvelo.tabs.attach = function(tab, options, callback) {
  function executeScript(file, callback) {
    if (file) {
      chrome.tabs.executeScript(tab.id, {file, allFrames: true}, () => {
        executeScript(options.contentScriptFile.shift(), callback);
      });
    } else {
      callback(tab);
    }
  }
  executeScript(options.contentScriptFile.shift(), function() {
    if (options.contentScript) {
      chrome.tabs.executeScript(tab.id, {code: options.contentScript, allFrames: true}, callback.bind(this, tab));
    } else {
      callback(tab);
    }
  });
};

mvelo.tabs.query = function(url, callback) {
  if (!/\*$/.test(url)) {
    url += '*';
  }
  chrome.tabs.query({url, currentWindow: true}, callback);
};

mvelo.tabs.create = function(url, complete, callback) {
  var newTab;
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
  var url = chrome.runtime.getURL('app/app.html');
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

mvelo.storage = {};

mvelo.storage.get = function(id) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(id, items => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items[id]);
      }
    });
  });
};

mvelo.storage.set = function(id, obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[id]: obj}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

mvelo.storage.remove = function(id) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(id, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

mvelo.storage.old = {};

mvelo.storage.old.get = function(id) {
  return JSON.parse(window.localStorage.getItem(id));
};

mvelo.storage.old.remove = function(id) {
  window.localStorage.removeItem(id);
};

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
      focused: true,
      type: 'popup'
    }, popup => {
      //console.log('popup created', popup);
      if (options && options.modal) {
        mvelo.windows.modalActive = true;
        var focusChangeHandler = function(newFocus) {
          //console.log('focus changed', newFocus);
          if (newFocus !== popup.id && newFocus !== chrome.windows.WINDOW_ID_NONE) {
            chrome.windows.update(popup.id, {focused: true});
          }
        };
        chrome.windows.onFocusChanged.addListener(focusChangeHandler);
        var removedHandler = function(removed) {
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
  var a = document.createElement('a');
  a.href = url;
  return a.hostname;
};

mvelo.util.getHost = function(url) {
  var a = document.createElement('a');
  a.href = url;
  return a.host;
};

mvelo.util.getDOMWindow = function() {
  return window;
};

mvelo.util.fetch = window.fetch.bind(window);

mvelo.l10n.get = chrome.i18n.getMessage;

mvelo.browserAction = {};

mvelo.browserAction.state = function(options) {
  if (typeof options.badge !== 'undefined') {
    chrome.browserAction.setBadgeText({text: options.badge});
  }
  if (typeof options.badgeColor !== 'undefined') {
    chrome.browserAction.setBadgeBackgroundColor({color: options.badgeColor});
  }
};

module.exports = mvelo;
