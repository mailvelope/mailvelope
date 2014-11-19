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

var data = require('sdk/self').data;
var tabs = require('sdk/tabs');
var windows = require('sdk/windows').browserWindows;
//var {open} = require('sdk/window/utils');
var timer = require('sdk/timers');
var ss = require('sdk/simple-storage');
var url = require('sdk/url');
var l10nGet = require("sdk/l10n").get;

// create mvelo namespace
eval(data.load('common/ui/inline/mvelo.js'));

mvelo.ffa = true;
mvelo.crx = false;

mvelo.data = {};

mvelo.data.url = function(path) {
  return data.url(path);
};

mvelo.data.load = function(path, callback) {
  var result = data.load(path);
  callback(result);
};

mvelo.data.loadDefaults = function() {
  var defaults = data.load('common/res/defaults.json');
  return JSON.parse(defaults);
};

mvelo.tabs = {};

mvelo.tabs.worker = {};

mvelo.tabs.getActive = function(callback) {
  callback(tabs.activeTab);
};

mvelo.tabs.attach = function(tab, options, callback) {
  var lopt = {};
  if (options) {
    lopt.contentScriptFile = options.contentScriptFile && options.contentScriptFile.map(function(file) {
      return data.url(file);
    });
    lopt.contentScript = options.contentScript;
    lopt.contentScriptOptions = options.contentScriptOptions;
  }
  lopt.contentScriptFile = lopt.contentScriptFile || [];
  lopt.contentScriptFile.push(data.url('ui/messageAdapter.js'));
  lopt.contentScriptOptions = lopt.contentScriptOptions || {};
  lopt.contentScriptOptions.expose_messaging = lopt.contentScriptOptions.expose_messaging || true;
  lopt.contentScriptOptions.data_path = data.url();
  var worker = tab.attach(lopt);
  this.worker[tab.index] = worker;
  worker.port.on('message-event', options.onMessage);
  //console.log('attach registers for message-event', Date.now());
  worker.port.once('message-event', function(msg) {
    if (callback) {
      // first event on port will fire callback after 200ms delay
      //console.log('starting attach callback timer', msg.event, Date.now());
      timer.setTimeout(callback.bind(this, tab), 200);
    }
  });
};

mvelo.tabs.query = function(url, callback) {
  var result = [];
  var tabs = windows.activeWindow.tabs;
  var reUrl = new RegExp(url + '.*');
  for (var i = 0; i < tabs.length; i++) {
    if (reUrl.test(tabs[i].url)) {
      result.push(tabs[i]);
    }
  }
  callback(result);
};

mvelo.tabs.create = function(url, complete, callback) {
  tabs.open({
    url: url,
    onReady: complete ? callback : undefined,
    onOpen: complete ? undefined : callback
  });
};

mvelo.tabs.activate = function(tab, callback) {
  tab.activate();
  if (callback) callback(tab);
};

mvelo.tabs.sendMessage = function(tab, msg) {
  this.worker[tab.index].port.emit('message-event', msg);
};

mvelo.tabs.loadOptionsTab = function(hash, callback) {
  // check if options tab already exists
  this.query(data.url("common/ui/options.html"), function(tabs) {
    if (tabs.length === 0) {
      // if not existent, create tab
      mvelo.tabs.create(data.url("common/ui/options.html") + hash, true, callback.bind(this, false));
    } else {
      // if existent, set as active tab
      mvelo.tabs.activate(tabs[0], callback.bind(this, true));
    }
  });
};

mvelo.storage = {};

mvelo.storage.get = function(id) {
  return ss.storage[id];
};

mvelo.storage.set = function(id, obj) {
  ss.storage[id] = obj;
};

mvelo.windows = {};

mvelo.windows.modalActive = false;

// FIFO list for window options
mvelo.windows.options = [];

mvelo.windows.openPopup = function(url, options, callback) {
  //console.log('openPopup:', url);
  this.options.push(options);
  var winOpts = {};
  winOpts.url = data.url(url);
  winOpts.onDeactivate = function() {
    if (options.modal) {
      this.activate();
    }
  };
  if (callback) {
    winOpts.onOpen = callback;
  }
  windows.open(winOpts);
};

var delegate = {
  onTrack: function (window) {
    // check for mailvelope popup
    if (window.arguments && /\/mailvelope/.test(window.arguments[0])) {
      window.locationbar.visible = false;
      window.menubar.visible = false;
      window.personalbar.visible = false;
      window.toolbar.visible = false;
      var options = mvelo.windows.options.shift();
      window.innerWidth = options.width;
      window.innerHeight = options.height;
      for (var main in winUtils.windowIterator()) {
        var y = parseInt(main.screenY + (main.outerHeight - options.height) / 2);
        var x = parseInt(main.screenX + (main.outerWidth - options.width) / 2);
        window.moveTo(x, y);
        break;
      }
    }
  }
};

var winUtils = require("sdk/deprecated/window-utils");
var tracker = new winUtils.WindowTracker(delegate);

mvelo.windows.BrowserWindow = function(id) {
  this._id = id;
};

mvelo.windows.BrowserWindow.prototype.activate = function() {
  chrome.windows.update(this._id, {focused: true});
};

mvelo.util = {};

var dompurifyWorker = require("sdk/page-worker").Page({
  contentScriptFile: [
    data.url('common/dep/purify.js'),
    data.url('dep/purifyAdapter.js')
  ]
});

mvelo.util.parseHTML = function(html, callback) {
  var message = {
    data: html,
    response: mvelo.getHash()
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

mvelo.l10n = {};
mvelo.l10n.get = function(id, substitutions) {
  if (substitutions) {
    return l10nGet.apply(null, [id].concat(substitutions));
  } else {
    return l10nGet(id);
  }
};

exports.mvelo = mvelo;
