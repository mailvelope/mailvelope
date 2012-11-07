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

var data = require('self').data;
var model = require('lib/ppgViewModel');
var {extension} = require('data/ui/messageAdapter');
var tabs = require('tabs');
var windows = require('windows').browserWindows;
var timer = require('timers');

var dataPathScript = 'mvelo.extension._dataPath = \'' + data.url() + '\'';


var mvelo = {};

mvelo.ffa = true;

mvelo.extension = extension;

mvelo.getModel = function() {
  return model;
}

mvelo.data = {}

mvelo.data.url = function(path) {
  return data.url(path);
}

mvelo.data.load = function(path, callback) {
  var result = data.load(path);
  callback(result);
}

mvelo.tabs = {}

mvelo.tabs.worker = {}

mvelo.tabs.getActive = function(callback) {
  callback(tabs.activeTab);
}

mvelo.tabs.attach = function(tab, options, callback) {
  var lopt = {};
  lopt.contentScriptFile = options.contentScriptFile.map(function(file) {
    return data.url(file);
  });
  lopt.contentScript = options.contentScript;
  console.log('attach tab', tab.id);
  console.log('attach tab', tab.index);
  var worker = tab.attach(lopt);
  this.worker[tab.index] = worker;
  worker.port.on('message-event', options.onMessage);
  console.log('attach registers for message-event', Date.now());
  worker.port.once('message-event', function(msg) {
    if (callback) {
      // first event on port will fire callback after 200ms delay
      console.log('starting attach callback timer', msg.event, Date.now());
      timer.setTimeout(callback.bind(this, tab), 200);
    }
  });
}

mvelo.tabs.query = function(url, callback) {
  var result = [];
  var tabs = windows.activeWindow.tabs;
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].url === url) {
      result.push(tabs[i]);
    }
  }
  callback(result);
}

mvelo.tabs.create = function(url, complete, callback) {
  tabs.open({
    url: url,
    onReady: complete ? callback : undefined,
    onOpen: complete ? undefined : callback
  });
}

mvelo.tabs.activate = function(tab, callback) {
  tab.activate();
  if (callback) callback(tab);
}

mvelo.tabs.sendMessage = function(tab, msg) {
  this.worker[tab.index].port.emit('message-event', msg);
}

mvelo.tabs.loadOptionsTab = function(hash, onMessage, callback) {
  // check if options tab already exists
  var options = data.url("ui/options.html") + hash;
  this.query(options, function(tabs) {
    if (tabs.length === 0) {
      // if not existent, create tab
      mvelo.tabs.create(options, true, function(tab) {
        console.log('before tab attach');
        mvelo.tabs.attach(tab, {
          contentScriptFile: [ 
            "common/dep/jquery.min.js",
            "common/ui/inline/mvelo.js",
            "ui/messageAdapter.js",
            "common/ui/options.js"
          ],
          contentScript: dataPathScript,
          onMessage: function(msg) {
            //console.log('message-event', msg.event);
            onMessage(msg, null, (function(response) {
              console.log('main.js handleMessageEvent response', msg.event ,msg.response);
              this.emit(msg.response, response);
            }).bind(this));
          }
        }, callback)
      });          
    } else {
      // if existent, set as active tab
      mvelo.tabs.activate(tabs[0], callback);
    }  
  });
}

exports.mvelo = mvelo;