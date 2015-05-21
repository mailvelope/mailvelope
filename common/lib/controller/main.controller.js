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

define(function(require, exports, module) {

  var mvelo = require('../../lib-mvelo').mvelo;
  var model = require('../pgpModel');
  var keyring = require('../keyring');
  var defaults = require('../defaults');
  var prefs = require('../prefs');
  var sub = require('./sub.controller');
  var openpgp = require('openpgp');
  var api = require('./api.controller');
  var uiLog = require('../uiLog');

  sub.factory.register('dFrame', require('./decrypt.controller').DecryptController);
  sub.factory.register('decryptCont', require('./decrypt.controller').DecryptController);
  sub.factory.register('eFrame', require('./encrypt.controller').EncryptController);
  sub.factory.register('imFrame', require('./import.controller').ImportController);
  sub.factory.register('importKeyDialog', require('./import.controller').ImportController);
  sub.factory.register('mainCS', require('./mainCs.controller').MainCsController);
  sub.factory.register('vFrame', require('./verify.controller').VerifyController);
  sub.factory.register('pwdDialog', require('./pwd.controller').PwdController);
  sub.factory.register('editor', require('./editor.controller').EditorController);
  sub.factory.register('editorCont', require('./editor.controller').EditorController);
  sub.factory.register('keyGenCont', require('./privateKey.controller').PrivateKeyController);
  sub.factory.register('keyGenDialog', require('./privateKey.controller').PrivateKeyController);
  sub.factory.register('keyBackupCont', require('./privateKey.controller').PrivateKeyController);
  sub.factory.register('keyBackupialog', require('./privateKey.controller').PrivateKeyController);

  // recipients of encrypted mail
  var scannedHosts = [];

  var specific = {};

  function extend(obj) {
    specific.initScriptInjection = obj.initScriptInjection;
    specific.activate = obj.activate;
    specific.deactivate = obj.deactivate;
  }

  function handleMessageEvent(request, sender, sendResponse) {
    //console.log('controller: handleMessageEvent', request);
    if (request.api_event) {
      return api.handleApiEvent(request, sender, sendResponse);
    }
    switch (request.event) {
      case 'pgpmodel':
        return methodEvent(model, request, sendResponse);
      case 'keyring':
        return methodEvent(keyring.getById(request.keyringId), request, sendResponse);
      case 'browser-action':
        onBrowserAction(request.action);
        break;
      case 'iframe-scan-result':
        scannedHosts = scannedHosts.concat(request.result);
        break;
      case 'set-watch-list':
        model.setWatchList(request.data);
        if (mvelo.ffa) {
          reloadFrames(true);
        }
        specific.initScriptInjection();
        break;
      case 'get-all-keyring-attr':
        sendResponse(keyring.getAllKeyringAttr());
        break;
      case 'set-keyring-attr':
        keyring.setKeyringAttr(request.keyringId, request.keyringAttr);
        break;
      case 'delete-keyring':
        if (request.keyringId !== mvelo.LOCAL_KEYRING_ID) {
          keyring.deleteKeyring(request.keyringId);
        } else {
          console.log("Keyring could not be deleted");
        }
        break;
      case 'send-by-mail':
        var link = encodeURI('mailto:?subject=Public OpenPGP key of ');
        link += encodeURIComponent(request.message.data.name);
        link += '&body=' + encodeURIComponent(request.message.data.armoredPublic);
        link += encodeURIComponent('\n*** exported with www.mailvelope.com ***');
        mvelo.tabs.create(link);
        break;
      case 'get-prefs':
        request.prefs = prefs.data();
        sendResponse(request);
        break;
      case 'set-prefs':
        prefs.update(request.data);
        sendResponse(true);
        break;
      case 'get-ui-log':
        request.secLog = uiLog.getAll();
        sendResponse(request);
        break;
      case 'get-security-background':
        sendResponse({
          color: prefs.data().security.secureBgndColor,
          iconColor: prefs.data().security.secureBgndIconColor,
          angle: prefs.data().security.secureBgndAngle,
          scaling: prefs.data().security.secureBgndScaling,
          width: prefs.data().security.secureBgndWidth,
          height: prefs.data().security.secureBgndHeight,
          colorId: prefs.data().security.secureBgndColorId
        });
        break;
      case 'get-version':
        sendResponse(defaults.getVersion());
        break;
      case 'activate':
        postToNodes(sub.getByMainType('mainCS'), {event: 'on'});
        specific.activate();
        prefs.update({main_active: true});
        break;
      case 'deactivate':
        postToNodes(sub.getByMainType('mainCS'), {event: 'off'});
        specific.deactivate();
        reloadFrames();
        prefs.update({main_active: false});
        break;
      case 'open-popup':
        mvelo.windows.openPopup(request.url);
        break;
      default:
        console.log('unknown event:', request);
    }
  }

  function methodEvent(thisArg, request, sendResponse) {
    var response = {};
    var callback = function(error, result) {
      sendResponse({error: error, result: result});
    };
    request.args = request.args || [];
    if (!Array.isArray(request.args)) {
      request.args = [request.args];
    }
    request.args.push(callback);
    try {
      response.result = thisArg[request.method].apply(thisArg, request.args);
    } catch (e) {
      console.log('error in method ' + request.method + ': ', e);
      response.error = e;
    }
    if (response.result !== undefined || response.error) {
      sendResponse({error: response.error, result: response.result});
    } else {
      // important to return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    }
  }

  function destroyNodes(subControllers) {
    postToNodes(subControllers, {event: 'destroy'});
  }

  function postToNodes(subControllers, msg) {
    subControllers.forEach(function(subContr) {
      subContr.ports[subContr.mainType].postMessage(msg);
    });
  }

  function reloadFrames(main) {
    if (main) {
      destroyNodes(sub.getByMainType('mainCS'));
    }
    // close frames
    destroyNodes(sub.getByMainType('dFrame'));
    destroyNodes(sub.getByMainType('vFrame'));
    destroyNodes(sub.getByMainType('eFrame'));
    destroyNodes(sub.getByMainType('imFrame'));
  }

  function addToWatchList() {
    var scanScript = " \
        var hosts = $('iframe').get().map(function(element) { \
          return $('<a/>').attr('href', element.src).prop('hostname'); \
        }); \
        hosts.push(document.location.hostname); \
        mvelo.extension.sendMessage({ \
          event: 'iframe-scan-result', \
          result: hosts \
        }); \
      ";

    mvelo.tabs.getActive(function(tab) {
      if (tab) {
        // reset scanned hosts buffer
        scannedHosts.length = 0;
        var options = {};
        options.contentScriptFile = [];
        options.contentScriptFile.push("common/dep/jquery.min.js");
        options.contentScriptFile.push("common/ui/mvelo.js");
        options.contentScript = scanScript;
        options.onMessage = handleMessageEvent;
        // inject scan script
        mvelo.tabs.attach(tab, options, function() {
          if (scannedHosts.length === 0) {
            return;
          }
          // remove duplicates and add wildcards
          var hosts = reduceHosts(scannedHosts);
          var site = model.getHostname(tab.url);
          scannedHosts.length = 0;
          mvelo.tabs.loadOptionsTab('', function(old, tab) {
            sendToWatchList(tab, site, hosts, old);
          });
        });
      }
    });

  }

  function sendToWatchList(tab, site, hosts, old) {
    mvelo.tabs.sendMessage(tab, {
      event: "add-watchlist-item",
      site: site,
      hosts: hosts,
      old: old
    });
  }

  function removeFromWatchList() {
    // get selected tab
    mvelo.tabs.getActive(function(tab) {
      if (tab) {
        var site = model.getHostname(tab.url);
        mvelo.tabs.loadOptionsTab('', function(old, tab) {
          mvelo.tabs.sendMessage(tab, {
            event: "remove-watchlist-item",
            site: site,
            old: old
          });
        });
      }
    });
  }

  function onBrowserAction(action) {
    switch (action) {
      case 'reload':
        reloadFrames();
        break;
      case 'add':
        addToWatchList();
        break;
      case 'remove':
        removeFromWatchList();
        break;
      case 'options':
        loadOptions();
        break;
      case 'showlog':
        loadOptions("#showlog");
        break;
      default:
        console.log('unknown browser action');
    }
  }

  function loadOptions(hash) {
    mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
      if (old) {
        mvelo.tabs.sendMessage(tab, {
          event: "reload-options",
          hash: hash
        });
      }
    });
  }

  function reduceHosts(hosts) {
    var reduced = [];
    hosts.forEach(function(element) {
      var labels = element.split('.');
      if (labels.length < 2) {
        return;
      }
      if (labels.length <= 3) {
        if (/www.*/.test(labels[0])) {
          labels[0] = '*';
        } else {
          labels.unshift('*');
        }
        reduced.push(labels.join('.'));
      } else {
        reduced.push('*.' + labels.slice(-3).join('.'));
      }
    });
    return mvelo.util.sortAndDeDup(reduced);
  }

  function getWatchListFilterURLs() {
    var result = [];
    model.getWatchList().forEach(function(site) {
      site.active && site.frames && site.frames.forEach(function(frame) {
        frame.scan && result.push(frame.frame);
      });
    });
    if (result.length !== 0) {
      result = mvelo.util.sortAndDeDup(result);
    }
    return result;
  }

  exports.handleMessageEvent = handleMessageEvent;
  exports.onBrowserAction = onBrowserAction;
  exports.extend = extend;
  exports.getWatchListFilterURLs = getWatchListFilterURLs;

});
