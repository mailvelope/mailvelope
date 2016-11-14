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

var ss = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require('sdk/page-mod');
var unload = require('sdk/system/unload');
var l10nGet = require("sdk/l10n").get;

var ToggleButton = require("sdk/ui/button/toggle").ToggleButton;
var Panel = require('sdk/panel').Panel;

var mvelo = require('./lib-mvelo.js');
var controller = require('../../controller/main.controller');
var prompts = require('./prompt');

var pageMods = {};

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

function init() {
  controller.extend({
    initScriptInjection: function() {
      injectMainCS();
    },
    activate: function() {},
    deactivate: function() {}
  });
  controller.init();
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
    contentURL: data.url('components/browser-action/popup.html'),
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
      '16': data.url('img/cryptography-icon16.png'),
      '48': data.url('img/cryptography-icon48.png')
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
  injectSignDialog();
  injectEmbeddedEditor();
  injectEmbeddedOptions();
  injectEmbeddedKeyGen();
  injectEmbeddedKeyBackup();
  injectEmbeddedRestoreBackup();
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
      data.url('lib/messageAdapter.js'),
      data.url('content-scripts/cs-mailvelope.js')
    ],
    contentStyle: getDynamicStyle('content-scripts/framestyles.css'),
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
  worker.port.on('port-message', controller.portManager.handlePortMessage);
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
        controller.portManager.removePort({name: portName});
      },
      ref: worker.port
    };
    controller.portManager.addPort(port);
  });
  worker.port.on('disconnect', function(portName) {
    controller.portManager.removePort({name: portName});
  });
  worker.on('pagehide', function() {
    pageHidden = true;
  });
  worker.on('detach', function() {
    controller.portManager.removePort(worker.port);
  });
  worker.port.on('message-event', function(msg) {
    var that = this;
    var result;
    switch (msg.event) {
      case 'get-l10n-messages':
        if (!pageHidden) { // otherwise exception
          result = {};
          msg.ids.forEach(function(id) {
            result[id] = l10nGet(id);
          });
          that.emit(msg.response, result);
        }
        break;
      case 'data-load':
        if (!pageHidden) { // otherwise exception
          result = data.load(msg.path);
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
  if (/^resource.*app\.html/.test(worker.url)) {
    mvelo.tabs.worker[worker.tab.index] = worker;
  }
}

function getDynamicStyle(path) {
  var css = data.load(path);
  var token = /\.\.\//g;
  css = css.replace(token, data.url(''));
  return css;
}

function injectMessageAdapter() {
  pageMods.messageAdapterPageMod = pageMod.PageMod({
    include: [
      data.url('components/decrypt-popup/decryptPopup.html*'),
      data.url('components/verify-popup/verifyPopup.html*'),
      data.url('components/editor/editor.html*'),
      data.url('components/enter-password/pwdDialog.html*'),
      data.url('components/import-key/importKeyDialog.html*'),
      data.url('app/app.html*'),
      data.url('components/recovery-sheet/recoverySheet.1und1.html*'),
      data.url('components/recovery-sheet/recoverySheet.html*')
    ],
    onAttach: onCsAttach,
    contentScriptFile: data.url('lib/messageAdapter.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      expose_messaging: true,
      data_path: data.url()
    }
  });
}

function injectDecryptInline() {
  pageMods.decryptInlinePageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=decryptInline*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('lib/messageAdapter.js'),
      data.url('mvelo.js'),
      data.url('components/decrypt-inline/decryptInline.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/decrypt-inline/decryptInline.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
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
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('lib/messageAdapter.js'),
      data.url('mvelo.js'),
      data.url('components/verify-inline/verifyInline.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/verify-inline/verifyInline.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
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
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('lib/messageAdapter.js'),
      data.url('mvelo.js'),
      data.url('components/sign-message/signDialog.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/sign-message/signDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
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
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('dep/angular/angular.min.js'),
      data.url('dep/ng-tags-input/ng-tags-input.min.js'),
      data.url('lib/messageAdapter.js'),
      data.url('mvelo.js'),
      data.url('components/editor/editor.js'),
      data.url('lib/file.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("dep/ng-tags-input/ng-tags-input.min.css"),
      data.url("dep/ng-tags-input/ng-tags-input.bootstrap.min.css"),
      data.url("dep/angular/angular-csp.css"),
      data.url("mvelo.css"),
      data.url("components/editor/editor.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
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
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('lib/messageAdapter.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('dep/bootstrap-sortable/bootstrap-sortable.js'),
      data.url('app/app.bundle.js'),
      data.url('lib/file.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("dep//bootstrap-sortable/bootstrap-sortable.css"),
      data.url("mvelo.css"),
      data.url("app/app.css"),
      data.url("app/fileEncrypt/encrypt.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
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
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('lib/messageAdapter.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('mvelo.js'),
      data.url('components/generate-key/keyGenDialog.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/generate-key/keyGenDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedKeyBackup() {
  pageMods.embeddedOptionsPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=keybackup*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('lib/messageAdapter.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('mvelo.js'),
      data.url('components/key-backup/keyBackupDialog.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/key-backup/keyBackupDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}

function injectEmbeddedRestoreBackup() {
  pageMods.embeddedOptionsPageMod = pageMod.PageMod({
    include: 'about:blank?mvelo=restoreBackup*',
    onAttach: onCsAttach,
    contentScriptFile: [
      data.url('dep/jquery.min.js'),
      data.url('lib/jquery.ext.js'),
      data.url('lib/messageAdapter.js'),
      data.url('dep/bootstrap/js/bootstrap.js'),
      data.url('mvelo.js'),
      data.url('components/restore-backup/restoreBackupDialog.js')
    ],
    contentStyleFile: [
      data.url("dep/bootstrap/css/bootstrap.css"),
      data.url("mvelo.css"),
      data.url("components/restore-backup/restoreBackupDialog.css")
    ],
    contentScriptWhen: 'ready',
    attachTo: ['existing', 'frame'],
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}
