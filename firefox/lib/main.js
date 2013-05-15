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
var ss = require("simple-storage");
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
  controller.extend({initScriptInjection: initScriptInjection});
  initScriptInjection();
  initInlineDialogs();
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
    contentScript: setDataPathScript(),
    contentStyle: getDynamicStyle()
  }

  if (activePageMod !== undefined) {
    activePageMod.destroy();
  }

  console.log('modOptions.include', modOptions.include);
  activePageMod = pageMod.PageMod(modOptions);

}

function onCsAttach(worker) {
  //console.log("Attaching content scripts", worker.url);
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
  //worker.port.on('message-event', handleMessageEvent);
}

function getDynamicStyle() {
  var css = data.load('common/ui/inline/framestyles.css');
  var token = /chrome-extension:\/\/__MSG_@@extension_id__\//g;
  css = css.replace(token, data.url());
  //console.log(css);
  return css;
}

function setDataPathScript() {
  return 'mvelo.extension._dataPath = \'' + data.url() + '\'';
}

function initInlineDialogs() {

  var decryptFiles = [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/ui/inline/mvelo.js'),
      data.url('ui/messageAdapter.js')
    ];
  var encryptFiles = decryptFiles.slice();

  decryptFiles.push(data.url('common/ui/inline/dialogs/decryptInline.js'));
  encryptFiles.push(data.url('common/ui/inline/dialogs/encryptDialog.js'));
  

  pageMod.PageMod({
    include: 'http://www.mailvelope.com/common/ui/inline/dialogs/decryptInline.html*',
    onAttach: onCsAttach,
    contentScriptFile: decryptFiles,
    contentScript: setDataPathScript(),
    contentStyleFile: [
      data.url('common/dep/bootstrap/css/bootstrap.min.css'),
      data.url('common/ui/inline/dialogs/decryptInline.css')
    ]
  });

  pageMod.PageMod({
    include: 'http://www.mailvelope.com/common/ui/inline/dialogs/encryptDialog.html*',
    onAttach: onCsAttach,
    contentScriptFile: encryptFiles,
    contentScript: setDataPathScript(),
    contentStyleFile: [
      data.url('common/dep/bootstrap/css/bootstrap.min.css'),
      data.url('common/ui/inline/dialogs/encryptDialog.css')
    ]
  });
 
}





