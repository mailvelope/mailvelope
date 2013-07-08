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

/*
// clean slate
var ss = require("sdk/simple-storage");
for (var obj in ss.storage) {
  console.log('delete ss:', obj);
  delete ss.storage[obj];
}
*/

var data = require('sdk/self').data;
var controller = require('data/common/lib/controller');
var pageMod = require("sdk/page-mod");
var tabs = require('sdk/tabs');

var activePageMod;
// recipients of encrypted mail
var eRecipientBuffer = {};
var scannedHosts = [];

var mailvelopePanel = require('sdk/panel').Panel({
  width: 200,
  height: 164,
  contentURL: data.url('common/ui/popup.html'),
  onMessage: onPanelMessage
});

require('sdk/widget').Widget({
  label: 'Mailvelope Options',
  id: 'mailvelope-options',
  contentURL: data.url('common/img/cryptography-icon16.png'),
  panel: mailvelopePanel
});

function init() {
  //console.log('main.js init()');
  controller.extend({initScriptInjection: initScriptInjection});
  initScriptInjection();
  injectMessageAdapter();
}

init();

function onPanelMessage(msg) {
  console.log('onPanelMessage', msg.action);
  controller.onBrowserAction(msg.action);
  mailvelopePanel.hide();
}

function initScriptInjection() {

  var filterURL = controller.getWatchListFilterURLs();
  
  var modOptions = {
    include: filterURL,
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/inline/build/cs-mailvelope.js')
    ],
    contentStyle: getDynamicStyle(),
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  }

  if (activePageMod !== undefined) {
    activePageMod.destroy();
  }

  console.log('modOptions.include', modOptions.include);
  activePageMod = pageMod.PageMod(modOptions);

}

function onCsAttach(worker) {
  console.log("Attaching content scripts", worker.url);
  worker.port.on('port-message', controller.handlePortMessage);
  worker.port.on('connect', function(portName) {
    var eventName = 'port-message' + '.' + portName;
    var that = this;
    var port = {
      name: portName,
      postMessage: function(message) {
        that.emit(eventName, message);
      },
      ref: that
    }
    controller.addPort(port);
  });
  worker.port.on('disconnect', function(portName) {
    controller.removePort({name: portName});
  });
  worker.on('detach', function() {
    controller.removePortByRef(this);
  });
  worker.port.on('message-event', function(msg) {
    var that = this;
    controller.handleMessageEvent(msg, null, function(respData) {
      that.emit(msg.response, respData);
    });
  });
}

function getDynamicStyle() {
  var css = data.load('common/ui/inline/framestyles.css');
  var token = /\.\.\/\.\./g;
  css = css.replace(token, data.url('common'));
  return css;
}

function injectMessageAdapter() {
  
  pageMod.PageMod({
    include: [
      data.url('common/ui/modal/decryptPopup.html*'),
      data.url('common/ui/modal/editor.html*'),
      data.url('common/ui/inline/dialogs/encryptDialog.html*'),
      data.url('common/ui/modal/pwdDialog.html*')
    ],
    onAttach: onCsAttach,
    contentScriptFile: data.url('ui/messageAdapter.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      expose_messaging: true,
      data_path: data.url()
    }
  });
 
}
