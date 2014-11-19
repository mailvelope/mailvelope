/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

define(function(require, exports, module) {

  var mvelo = require('mvelo');

  mvelo.crx = true;
  mvelo.ffa = false;

  var dompurify = require('dompurify');

  mvelo.data = {};

  mvelo.data.url = function(path) {
    return chrome.runtime.getURL(path);
  };

  mvelo.data.load = function(path, callback) {
    $.get(chrome.runtime.getURL(path), callback);
  };

  mvelo.data.loadDefaults = function() {
    return require('../lib/json-loader!common/res/defaults.json');
  };

  mvelo.tabs = {};

  mvelo.tabs.getActive = function(callback) {
    // get selected tab, "*://*/*" filters out non-http(s)
    chrome.tabs.query({active: true, currentWindow: true, url: "*://*/*"}, function(tabs) {
      callback(tabs[0]);
    });
  };

  mvelo.tabs.attach = function(tab, options, callback) {
    function executeScript(file, callback) {
      if (file) {
        chrome.tabs.executeScript(tab.id, {file: file, allFrames: true}, function() {
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
    chrome.tabs.query({url: url, currentWindow: true}, callback);
  };

  mvelo.tabs.create = function(url, complete, callback) {
    chrome.tabs.create({url: url}, function(tab) {
      if (complete) {
        // wait for tab to be loaded
        chrome.tabs.onUpdated.addListener(function updateListener(tabid, info) {
          if (tabid === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(updateListener);
            if (callback) callback(tab);
          }
        });
      } else {
        if (callback) callback(tab);
      }
    });
  };

  mvelo.tabs.activate = function(tab, callback) {
    chrome.tabs.update(tab.id, { active: true }, callback);
  };

  mvelo.tabs.sendMessage = function(tab, msg) {
    chrome.tabs.sendMessage(tab.id, msg);
  };

  mvelo.tabs.loadOptionsTab = function(hash, callback) {
    // check if options tab already exists
    this.query(chrome.runtime.getURL('common/ui/options.html'), function(tabs) {
      if (tabs.length === 0) {
        // if not existent, create tab
        mvelo.tabs.create('common/ui/options.html' + hash, callback !== undefined, callback.bind(this, false));
      } else {
        // if existent, set as active tab
        mvelo.tabs.activate(tabs[0], callback.bind(this, true));
      }
    });
  };

  mvelo.storage = {};

  mvelo.storage.get = function(id) {
    return JSON.parse(window.localStorage.getItem(id));
  };

  mvelo.storage.set = function(id, obj) {
    window.localStorage.setItem(id, JSON.stringify(obj));
  };

  mvelo.windows = {};

  mvelo.windows.modalActive = false;

  mvelo.windows.openPopup = function(url, options, callback) {
    chrome.windows.getCurrent(null, function(current) {
      chrome.windows.create({
        url: url,
        width: options.width,
        height: options.height,
        top: parseInt(current.top + (current.height - options.height) / 2),
        left: parseInt(current.left + (current.width - options.width) / 2),
        focused: true,
        type: 'popup'
      }, function(popup) {
        //console.log('popup created', popup);
        if (options.modal) {
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
        if (callback) callback(new mvelo.windows.BrowserWindow(popup.id));
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

  mvelo.util.parseHTML = function(html, callback) {
    callback(dompurify.sanitize(html));
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

  mvelo.l10n.get = chrome.i18n.getMessage;

  exports.mvelo = mvelo;

});