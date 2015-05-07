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

'use strict';

var system = require('sdk/system');
var ss = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require('sdk/page-mod');
var tabs = require('sdk/tabs');
var unload = require('sdk/system/unload');
var l10nGet = require("sdk/l10n").get;
var browserVersion = parseInt(system.version.substr(0, 2));

var ToggleButton = require("sdk/ui/button/toggle").ToggleButton;
var Panel = require('sdk/panel').Panel;

checkStaticArgs();

var mvelo = require('./lib-mvelo.js').mvelo;
var model = require('./common/pgpModel');
var controller = require('./common/controller/main.controller');
var subController = require('./common/controller/sub.controller');
var prompts = require('./prompt');

var pageMods = {};
// recipients of encrypted mail
var eRecipientBuffer = {};
var scannedHosts = [];

var mailvelopePanel = null;

unload.when(function(reason) {
  // reason is never 'uninstall' https://bugzilla.mozilla.org/show_bug.cgi?id=571049
  if (reason === 'uninstall' || reason === 'disable') {
    //console.log("Extension disabled or unistalled");
    if (prompts.confirm(l10nGet("clear_localstorage_confirm_title"), l10nGet("clear_localstorage_confirm_message"))) {
      clearStorage();
    }
  }
});

function checkStaticArgs() {
  // call cfx run --static-args='{ "clear_storage": true }'
  if (system.staticArgs.clear_storage) {
    clearStorage();
  }
}

function init() {
  controller.extend({
    initScriptInjection: function() {
      injectMainCS();
    },
    activate: function() {},
    deactivate: function() {}
  });
  model.init();
  initAddonButton();
  activatePageMods();
}

init();

function onPanelMessage(msg) {
  switch (msg.event) {
    case 'close-popup':
      mailvelopePanel.hide();
      break;
    case 'browser-action':
    case 'activate':
    case 'deactivate':
      mailvelopePanel.hide();
      controller.handleMessageEvent(msg, null, mailvelopePanel.postMessage.bind(mailvelopePanel));
      break;
    default:
      controller.handleMessageEvent(msg, null, mailvelopePanel.postMessage.bind(mailvelopePanel));
  }
}

function initAddonButton() {
  mailvelopePanel = new Panel({
    width: 202,
    height: 310,
    contentURL: data.url('common/ui/popup.html'),
    onMessage: onPanelMessage,
    onHide: function() {
      if (mvelo.browserAction.toggleButton) {
        mvelo.browserAction.toggleButton.state('window', {checked: false});
      }
    },
    onShow: function() {
      this.postMessage({"event": "init"});
    }
  });
  mvelo.browserAction.toggleButton = new ToggleButton({
    id: 'mailvelope-options',
    label: 'Mailvelope',
    icon: {
      '16': data.url('common/img/cryptography-icon16.png'),
      '48': data.url('common/img/cryptography-icon48.png')
    },
    onChange: function(state) {
      if (state.checked) {
        mailvelopePanel.show({
          position: mvelo.browserAction.toggleButton
        });
      }
    }
  });
}

function activatePageMods() {
  injectMainCS();
  injectMessageAdapter();
  injectDecryptInline();
  injectVerifyInline();
  injectEncryptDialog();
  injectSignDialog();
  injectEmbeddedEditor();
  injectEmbeddedOptions();
  injectEmbeddedKeyGen();
}

function deactivate() {
  for (var mod in pageMods) {
    pageMods[mod].destroy();
  }
}

function clearStorage() {
  for (var obj in ss.storage) {
    delete ss.storage[obj];
  }
}

function injectMainCS() {

  var filterURL = controller.getWatchListFilterURLs();

  var modOptions = {
    include: filterURL,
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/inline/cs-mailvelope.js')
    ],
    contentStyle: getDynamicStyle('common/ui/inline/framestyles.css'),
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    },
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'top', 'frame']
  };

  if (pageMods.mainPageMod !== undefined) {
    try {
      pageMods.mainPageMod.destroy();
    } catch (e) {
      console.log('Destroying active page-mod failed', e);
    }
  }

  //console.log('modOptions.include', modOptions.include);
  pageMods.mainPageMod = pageMod.PageMod(modOptions);

}

function onCsAttach(worker) {
  //console.log("Attaching content scripts", worker.url);
  var pageHidden = false;
  worker.port.on('port-message', subController.handlePortMessage);
  worker.port.on('connect', function(portName) {
    var eventName = 'port-message' + '.' + portName;
    var port = {
      name: portName,
      postMessage: function(message) {
        if (!pageHidden) {
          worker.port.emit(eventName, message);
        }
      },
      disconnect: function() {
        subController.removePort({name: portName});
      },
      ref: worker.port
    };
    subController.addPort(port);
  });
  worker.port.on('disconnect', function(portName) {
    subController.removePort({name: portName});
  });
  worker.on('pagehide', function() {
    pageHidden = true;
  });
  worker.on('detach', function() {
    subController.removePort(worker.port);
  });
  worker.port.on('message-event', function(msg) {
    var that = this;
    switch (msg.event) {
      case 'get-l10n-messages':
        if (!pageHidden) { // otherwise exception
          var result = {};
          msg.ids.forEach(function(id) {
            result[id] = l10nGet(id);
          });
          that.emit(msg.response, result);
        }
        break;
      case 'data-load':
        if (!pageHidden) { // otherwise exception
          var result = data.load(msg.path);
          that.emit(msg.response, result);
        }
        break;
      default:
        controller.handleMessageEvent(msg, null, function(respData) {
          if (!pageHidden) { // otherwise exception
            that.emit(msg.response, respData);
          }
        });
    }
  });
  if (/^resource.*options\.html/.test(worker.url)) {
    mvelo.tabs.worker[worker.tab.index] = worker;
  }
}

function getDynamicStyle(path) {
  var css = data.load(path);
  var token = /\.\.\/\.\./g;
  css = css.replace(token, data.url('common'));
  return css;
}

function injectMessageAdapter() {
  pageMods.messageAdapterPageMod = pageMod.PageMod({
    include: [
      data.url('common/ui/modal/decryptPopup.html*'),
      data.url('common/ui/modal/verifyPopup.html*'),
      data.url('common/ui/editor/editor.html*'),
      data.url('common/ui/modal/pwdDialog.html*'),
      data.url('common/ui/modal/importKeyDialog.html*'),
      data.url('common/ui/options.html*')
    ],
    onAttach: onCsAttach,
    contentScriptFile: data.url('ui/messageAdapter.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      expose_messaging: true,
      data_path: data.url(),
      browser_version: browserVersion
    }
  });
}

function injectDecryptInline() {
  pageMods.decryptInlinePageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=decryptInline*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/inline/dialogs/decryptInline.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/inline/dialogs/decryptInline.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectVerifyInline() {
  pageMods.verifyInlinePageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=verifyInline*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/inline/dialogs/verifyInline.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/inline/dialogs/verifyInline.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEncryptDialog() {
  pageMods.encryptDialogPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=encryptDialog*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/inline/dialogs/encryptDialog.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/inline/dialogs/encryptDialog.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectSignDialog() {
  pageMods.signDialogPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=signDialog*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/inline/dialogs/signDialog.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/inline/dialogs/signDialog.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedEditor() {
  pageMods.embeddedEditorPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=editor*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/editor/editor.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/editor/editor.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedOptions() {
  pageMods.embeddedOptionsPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=options*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('common/dep/bootstrap-sortable/bootstrap-sortable.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/options.js'),
      data.url('common/ui/settings/watchList.js'),
      data.url('common/ui/settings/security.js'),
      data.url('common/ui/settings/general.js'),
      data.url('common/ui/keyring/keyRing.js'),
      data.url('common/ui/keyring/importKey.js'),
      data.url('common/ui/keyring/generateKey.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/dep//bootstrap-sortable/bootstrap-sortable.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/options.css"),
      data.url("common/ui/providers.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedKeyGen() {
  pageMods.embeddedOptionsPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=keyGenDialog*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('common/dep/jquery.min.js'),
      data.url('common/dep/jquery.ext.js'),
      data.url('ui/messageAdapter.js'),
      data.url('common/dep/bootstrap/js/bootstrap.js'),
      data.url('common/ui/mvelo.js'),
      data.url('common/ui/inline/dialogs/keyGenDialog.js')
    ],
    contentStyleFile: [
      data.url("common/dep/bootstrap/css/bootstrap.css"),
      data.url("common/ui/mvelo.css"),
      data.url("common/ui/inline/dialogs/keyGenDialog.css")
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}
