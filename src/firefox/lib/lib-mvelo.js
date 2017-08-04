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

/* eslint strict: 0 */

const data = require('sdk/self').data;
const tabs = require('sdk/tabs');
const windows = require('sdk/windows').browserWindows;
const addonWindow = require('sdk/addon/window');
const timer = require('sdk/timers');
const ss = require('sdk/simple-storage');
const url = require('sdk/url');
const l10nGet = require('sdk/l10n').get;

const mvelo = require('../../mvelo');
const CWorker = require('./web-worker').Worker;
const request = require('sdk/request').Request;

let mainWindow = windows.activeWindow; // current active main window
windows.on('close', () => mainWindow = windows.activeWindow);

mvelo.ffa = true;
mvelo.crx = false;

mvelo.data = {};

mvelo.data.url = function(path) {
  return data.url(path);
};

mvelo.data.load = function(path) {
  return new Promise(resolve => {
    resolve(data.load(path));
  });
};

mvelo.tabs = {};

mvelo.tabs.worker = {};

mvelo.tabs.getActive = function(callback) {
  callback(tabs.activeTab);
};

mvelo.tabs.attach = function(tab, options, callback) {
  const lopt = {};
  if (options) {
    lopt.contentScriptFile = options.contentScriptFile && options.contentScriptFile.map(file => data.url(file));
    lopt.contentScript = options.contentScript;
    lopt.contentScriptOptions = options.contentScriptOptions;
  }
  lopt.contentScriptFile = lopt.contentScriptFile || [];
  lopt.contentScriptFile.push(data.url('lib/messageAdapter.js'));
  lopt.contentScriptOptions = lopt.contentScriptOptions || {};
  lopt.contentScriptOptions.expose_messaging = lopt.contentScriptOptions.expose_messaging || true;
  lopt.contentScriptOptions.data_path = data.url();
  const worker = tab.attach(lopt);
  this.worker[tab.index] = worker;
  worker.port.on('message-event', options.onMessage);
  //console.log('attach registers for message-event', Date.now());
  worker.port.once('message-event', function() {
    if (callback) {
      // first event on port will fire callback after 200ms delay
      //console.log('starting attach callback timer', msg.event, Date.now());
      timer.setTimeout(callback.bind(this, tab), 200);
    }
  });
};

mvelo.tabs.query = function(url, callback) {
  const result = [];
  const tabs = windows.activeWindow.tabs;
  const reUrl = new RegExp(`${url}.*`);
  for (let i = 0; i < tabs.length; i++) {
    if (reUrl.test(tabs[i].url)) {
      result.push(tabs[i]);
    }
  }
  callback(result);
};

mvelo.tabs.create = function(url, complete, callback) {
  tabs.open({
    url,
    onReady: complete ? callback : undefined,
    onOpen: complete ? undefined : callback
  });
};

mvelo.tabs.activate = function(tab, options, callback) {
  if (options.url) {
    tab.url = options.url;
  }
  tab.activate();
  if (callback) {
    callback(tab);
  }
};

mvelo.tabs.eventIndex = 0;

mvelo.tabs.sendMessage = function(tab, msg, callback) {
  if (callback) {
    msg.response = `resp${this.eventIndex++}`;
    this.worker[tab.index].port.once(msg.response, callback);
  }
  this.worker[tab.index].port.emit('message-event', msg);
};

mvelo.tabs.loadOptionsTab = function(hash, callback) {
  mainWindow.activate();
  // check if options tab already exists
  const url = data.url('app/app.html');
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

mvelo.storage._setPort = function(port) {
  this.port = port;
  this.getQueue = [];
  this.setQueue = [];
  this.removeQueue = [];
  port.onMessage.addListener(msg => {
    let reply;
    switch (msg.event) {
      case 'storage-get-response':
        reply = this.getQueue.shift();
        break;
      case 'storage-set-response':
        reply = this.setQueue.shift();
        break;
      case 'storage-remove-response':
        reply = this.removeQueue.shift();
        break;
      default:
        console.log('unknown storage event:', msg.event);
    }
    if (msg.error) {
      reply.reject(msg.error);
    } else {
      reply.resolve(msg.data);
    }
  });
};

mvelo.storage.get = function(id) {
  return new Promise((resolve, reject) => {
    this.port.postMessage({event: 'storage-get', id});
    this.getQueue.push({resolve, reject});
  });
};

mvelo.storage.set = function(id, obj) {
  return new Promise((resolve, reject) => {
    this.port.postMessage({event: 'storage-set', id, value: obj});
    this.setQueue.push({resolve, reject});
  });
};

mvelo.storage.remove = function(id) {
  return new Promise((resolve, reject) => {
    this.port.postMessage({event: 'storage-remove', id});
    this.removeQueue.push({resolve, reject});
  });
};

mvelo.storage.old = {};

mvelo.storage.old.get = function(id) {
  if (typeof ss.storage[id] === 'string') {
    return JSON.parse(ss.storage[id]);
  }
  return ss.storage[id];
};

mvelo.storage.old.remove = function(id) {
  delete ss.storage[id];
};

mvelo.windows = {};

mvelo.windows.modalActive = false;

mvelo.windows.internalURL = new RegExp(`^${data.url('')}`);

// FIFO list for window options
mvelo.windows.options = [];

mvelo.windows.openPopup = function(url, options, callback) {
  const winOpts = {};
  winOpts.url = data.url(url);
  if (mvelo.windows.internalURL.test(winOpts.url)) {
    this.options.push(options);
  }
  winOpts.onDeactivate = function() {
    if (options && options.modal) {
      this.activate();
    }
  };
  if (callback) {
    winOpts.onOpen = callback;
  }
  mainWindow = windows.activeWindow;
  windows.open(winOpts);
};

const delegate = {
  onTrack(window) {
    // check for mailvelope popup
    if (window.arguments && mvelo.windows.internalURL.test(window.arguments[0])) {
      window.locationbar.visible = false;
      window.menubar.visible = false;
      window.personalbar.visible = false;
      window.toolbar.visible = false;
      const options = mvelo.windows.options.shift();
      if (options) {
        window.innerWidth = options.width;
        window.innerHeight = options.height;
        for (const main in winUtils.windowIterator()) {
          const y = parseInt(main.screenY + (main.outerHeight - options.height) / 2);
          const x = parseInt(main.screenX + (main.outerWidth - options.width) / 2);
          window.moveTo(x, y);
          break;
        }
      }
    }
  }
};

const winUtils = require('sdk/deprecated/window-utils');
new winUtils.WindowTracker(delegate);

mvelo.windows.BrowserWindow = function(id) {
  this._id = id;
};

mvelo.windows.BrowserWindow.prototype.activate = function() {
  chrome.windows.update(this._id, {focused: true});
};

mvelo.util = mvelo.util || {};

const dompurifyWorker = require('sdk/page-worker').Page({
  contentScriptFile: [
    data.url('dep/purify.js'),
    data.url('dep/purifyAdapter.js')
  ]
});

mvelo.util.parseHTML = function(html, callback) {
  const message = {
    data: html,
    response: mvelo.util.getHash()
  };
  dompurifyWorker.port.once(message.response, callback);
  dompurifyWorker.port.emit('parse', message);
};

// must be bound to window, otherwise illegal invocation
mvelo.util.setTimeout = timer.setTimeout;
mvelo.util.clearTimeout = timer.clearTimeout;

mvelo.util.getHostname = function(source) {
  return url.URL(source).host.split(':')[0];
};

mvelo.util.getHost = function(source) {
  return url.URL(source).host;
};

mvelo.util.getDOMWindow = function() {
  return addonWindow.window;
};

mvelo.util.getWorker = function() {
  return CWorker;
};

mvelo.util.fetch = function(url, options) {
  options = options || {};
  return new Promise(resolve => {
    const fetchRequ = request({
      url,
      content: options.body,
      contentType: 'application/json',
      onComplete(response) {
        resolve({
          status: response.status,
          json() {
            return Promise.resolve(response.json);
          }
        });
      }
    });
    switch (options.method) {
      case 'POST':
        fetchRequ.post();
        break;
      case 'DELETE':
        fetchRequ.delete();
        break;
      default:
        fetchRequ.get();
    }
  });
};

mvelo.l10n = mvelo.l10n || {};

mvelo.l10n.get = function(id, substitutions) {
  if (substitutions) {
    return l10nGet.apply(null, [id].concat(substitutions));
  } else {
    return l10nGet(id);
  }
};

mvelo.browserAction = {};

mvelo.browserAction.toggleButton = null;

mvelo.browserAction.state = function(options) {
  this.toggleButton.state('window', options);
};

module.exports = mvelo;
