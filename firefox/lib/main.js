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

var system = require('sdk/system');
var ss = require('sdk/simple-storage');
var data = require('sdk/self').data;
var pageMod = require('sdk/page-mod');
var tabs = require('sdk/tabs');
var unload = require('sdk/system/unload');
var l10nGet = require("sdk/l10n").get;
var browserVersion = parseInt(system.version.substr(0, 2));

try {
  var { ToggleButton } = require("sdk/ui/button/toggle");
} catch (e) {}

checkStaticArgs();

var mvelo = require('./lib-mvelo.js').mvelo;
var controller = require('./common/controller/main.controller');
var subController = require('./common/controller/sub.controller');
var prefs = require('./common/prefs').data;
var prompts = require('./prompt');

var pageMods = {};
// recipients of encrypted mail
var eRecipientBuffer = {};
var scannedHosts = [];

var mailvelopePanel = require('sdk/panel').Panel({
  width: 180,
  height: 216,
  contentURL: data.url('common/ui/popup.html'),
  onMessage: onPanelMessage,
  onHide: function() {
    if (toggleButton) {
      toggleButton.state('window', {checked: false});
    }
  }
});

function onPanelMessage(msg) {
  //console.log('onPanelMessage', mailvelopePanel.postMessage);
  controller.handleMessageEvent(msg, null, mailvelopePanel.postMessage.bind(mailvelopePanel));
  mailvelopePanel.hide();
}

var toggleButton = ToggleButton({
  id: 'mailvelope-options',
  label: 'mailvelope-options',
  icon: {
    '16': data.url('common/img/cryptography-icon16.png'),
    '48': data.url('common/img/cryptography-icon48.png')
  },
  onChange: function(state) {
    if (state.checked) {
      mailvelopePanel.show({
        position: toggleButton
      });
    }
  }
});

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
      if (prefs.main_active) {
        injectMainCS();
      }
    },
    activate: activatePageMods,
    deactivate: deactivate
  });
  if (prefs.main_active) {
    activatePageMods();
  }
}

init();

function activatePageMods() {
  injectMainCS();
  injectMessageAdapter();
  injectDecryptInline();
  injectVerifyInline();
  injectEncryptDialog();
  injectSignDialog();
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
    var that = this;
    var port = {
      name: portName,
      postMessage: function(message) {
        if (!pageHidden) {
          that.emit(eventName, message);
        }
      },
      disconnect: function() {
        subController.removePort({name: portName});
      },
      ref: that
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
    subController.removePort(this.port);
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
      data.url('common/ui/modal/editor.html*'),
      data.url('common/ui/inline/dialogs/encryptDialog.html*'),
      data.url('common/ui/inline/dialogs/signDialog.html*'),
      data.url('common/ui/modal/pwdDialog.html*'),
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
      data.url('common/ui/inline/mvelo.js'),
      data.url('common/ui/inline/dialogs/decryptInline.js')
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
      data.url('common/ui/inline/mvelo.js'),
      data.url('common/ui/inline/dialogs/verifyInline.js')
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
      data.url('common/ui/inline/mvelo.js'),
      data.url('common/ui/inline/dialogs/encryptDialog.js')
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
      data.url('common/ui/inline/mvelo.js'),
      data.url('common/ui/inline/dialogs/signDialog.js')
    ],
    contentScriptWhen: 'ready',
    contentScriptOptions: {
      expose_messaging: false,
      data_path: data.url()
    }
  });
}
