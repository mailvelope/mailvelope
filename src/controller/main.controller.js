/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';
import * as  model from '../modules/pgpModel';
import * as keyring from '../modules/keyring';
import {getVersion} from '../modules/defaults';
import * as prefs from '../modules/prefs';
import * as sub from './sub.controller';
export {sub as portManager};
import {handleApiEvent} from './api.controller';
import * as uiLog from '../modules/uiLog';

import DecryptController from './decrypt.controller';
import EncryptController from './encrypt.controller';
import ImportController from './import.controller';
import MainCsController from './mainCs.controller';
import VerifyController from './verify.controller';
import PwdController from './pwd.controller';
import EditorController from './editor.controller';
import {SyncController} from './sync.controller';
import PrivateKeyController from './privateKey.controller';

sub.factory.register('dFrame',              DecryptController);
sub.factory.register('decryptCont',         DecryptController);
sub.factory.register('eFrame',              EncryptController);
sub.factory.register('imFrame',             ImportController);
sub.factory.register('importKeyDialog',     ImportController);
sub.factory.register('mainCS',              MainCsController);
sub.factory.register('vFrame',              VerifyController);
sub.factory.register('pwdDialog',           PwdController);
sub.factory.register('editor',              EditorController);
sub.factory.register('editorCont',          EditorController);
sub.factory.register('syncHandler',         SyncController);
sub.factory.register('keyGenCont',          PrivateKeyController);
sub.factory.register('keyGenDialog',        PrivateKeyController);
sub.factory.register('keyBackupCont',       PrivateKeyController);
sub.factory.register('keyBackupDialog',     PrivateKeyController);
sub.factory.register('restoreBackupCont',   PrivateKeyController);
sub.factory.register('restoreBackupDialog', PrivateKeyController);


let scannedHosts = [];
const specific = {};

export function init() {
  return model.init();
}

export function extend(obj) {
  specific.initScriptInjection = obj.initScriptInjection;
  specific.activate = obj.activate;
  specific.deactivate = obj.deactivate;
}

export function handleMessageEvent(request, sender, sendResponse) {
  //console.log('controller: handleMessageEvent', request);
  if (request.api_event) {
    return handleApiEvent(request, sender, sendResponse);
  }
  switch (request.event) {
    case 'pgpmodel':
      methodEvent(model, request, sendResponse);
      // return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    case 'keyring':
      methodEvent(keyring.getById(request.keyringId), request, sendResponse)
      .then(() => {
        // update editor controllers
        sub.getByMainType('editor').forEach(editorCntrl => editorCntrl.sendKeyUpdate());
      });
      // return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    case 'browser-action':
      onBrowserAction(request.action);
      break;
    case 'iframe-scan-result':
      scannedHosts = scannedHosts.concat(request.result);
      break;
    case 'set-watch-list':
      model.setWatchList(request.data)
      .then(() => {
        if (mvelo.ffa) {
          reloadFrames(true);
        }
        specific.initScriptInjection();
        sendResponse(true);
      });
      break;
    case 'init-script-injection':
      if (mvelo.ffa) {
        reloadFrames(true);
      }
      specific.initScriptInjection();
      break;
    case 'get-all-keyring-attr':
      keyring.getAllKeyringAttr()
      .then(result => sendResponse({result}))
      .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
      // return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    case 'set-keyring-attr':
      keyring.setKeyringAttr(request.keyringId, request.keyringAttr);
      break;
    case 'get-active-keyring':
      sendResponse(sub.getActiveKeyringId());
      break;
    case 'set-active-keyring':
      sub.setActiveKeyringId(request.keyringId);
      break;
    case 'delete-keyring':
      Promise.resolve()
      .then(() => {
        if (request.keyringId === mvelo.LOCAL_KEYRING_ID) {
          throw new Error('Cannot delete main keyring')
        }
        return keyring.deleteKeyring(request.keyringId)
      })
      .then(() => {
        sub.setActiveKeyringId(mvelo.LOCAL_KEYRING_ID);
        sendResponse(true);
      })
      .catch(err => sendResponse({error: mvelo.util.mapError(err)}));
      // return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    case 'send-by-mail':
      var link = encodeURI('mailto:?subject=Public OpenPGP key of ');
      link += encodeURIComponent(request.message.data.name);
      link += '&body=' + encodeURIComponent(request.message.data.armoredPublic);
      link += encodeURIComponent('\n*** exported with www.mailvelope.com ***');
      mvelo.tabs.create(link);
      break;
    case 'get-prefs':
      request.prefs = prefs.prefs;
      sendResponse(request);
      break;
    case 'set-prefs':
      prefs.update(request.data)
      .then(() => {
        sendResponse(true);
        // update content scripts
        sub.getByMainType('mainCS').forEach(mainCScontrl => mainCScontrl.updatePrefs());
      });
      // return true for async calls, otherwise Chrome does not handle sendResponse
      return true;
    case 'get-ui-log':
      request.secLog = uiLog.getAll();
      request.secLog = request.secLog.slice(request.securityLogLength);
      sendResponse(request);
      break;
    case 'get-security-background':
      sendResponse({
        color: prefs.prefs.security.secureBgndColor,
        iconColor: prefs.prefs.security.secureBgndIconColor,
        angle: prefs.prefs.security.secureBgndAngle,
        scaling: prefs.prefs.security.secureBgndScaling,
        width: prefs.prefs.security.secureBgndWidth,
        height: prefs.prefs.security.secureBgndHeight,
        colorId: prefs.prefs.security.secureBgndColorId
      });
      break;
    case 'get-version':
      sendResponse(getVersion());
      break;
    case 'activate':
      prefs.update({main_active: true})
      .then(() => {
        postToNodes(sub.getByMainType('mainCS'), {event: 'on'});
        specific.activate();
      });
      break;
    case 'deactivate':
      prefs.update({main_active: false})
      .then(() => {
        postToNodes(sub.getByMainType('mainCS'), {event: 'off'});
        specific.deactivate();
        reloadFrames();
      });
      break;
    case 'get-all-key-userid':
      sendResponse({result: keyring.getAllKeyUserId()});
      break;
    case 'open-tab':
      mvelo.tabs.create(request.url);
      break;
    case 'options-ready':
      mvelo.tabs.onOptionsTabReady();
      break;
    case 'get-app-data-slot':
      sendResponse({result: sub.getAppDataSlot(request.slotId)});
      break;
    default:
      console.log('unknown event:', request);
  }
}

function methodEvent(thisArg, request, sendResponse) {
  //console.log('controller: methodEvent', request);
  request.args = request.args || [];
  if (!Array.isArray(request.args)) {
    request.args = [request.args];
  }
  return Promise.resolve()
  .then(function() {
    return thisArg[request.method].apply(thisArg, request.args);
  })
  .then(function(result) {
    sendResponse({result: result});
  })
  .catch(function(error) {
    console.log('error in method ' + request.method + ': ', error);
    sendResponse({error: mvelo.util.mapError(error)});
  });
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
      options.contentScriptFile.push('dep/jquery.min.js');
      options.contentScriptFile.push('mvelo.js');
      options.contentScript = scanScript;
      options.onMessage = handleMessageEvent;
      // inject scan script
      mvelo.tabs.attach(tab, options, function() {
        // wait for message from scan script
        mvelo.util.setTimeout(() => {
          if (scannedHosts.length === 0) {
            return;
          }
          var site = model.getHostname(tab.url);
          scannedHosts.length = 0;
          var slotId = mvelo.util.getHash();
          sub.setAppDataSlot(slotId, site);
          mvelo.tabs.loadOptionsTab(`?slotId=${slotId}#/settings/watchlist/push`, () => {});
        }, 250);
      });
    }
  });

}

export function onBrowserAction(action) {
  switch (action) {
    case 'reload':
      reloadFrames();
      break;
    case 'add':
      addToWatchList();
      break;
    case 'options':
      loadOptions('#/keyring');
      break;
    case 'showlog':
      loadOptions('#/settings/security-log');
      break;
    default:
      console.log('unknown browser action');
  }
}

function loadOptions(hash) {
  mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
    if (old) {
      mvelo.tabs.sendMessage(tab, {
        event: 'reload-options',
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

export function getWatchListFilterURLs() {
  return model.getWatchList()
  .then(watchList => {
    let result = [];
    watchList.forEach(function(site) {
      site.active && site.frames && site.frames.forEach(function(frame) {
        frame.scan && result.push(frame.frame);
      });
    });
    // add hkp key server to enable key import
    let hkpHost = model.getHostname(prefs.prefs.keyserver.hkp_base_url);
    hkpHost = reduceHosts([hkpHost]);
    result.push(...hkpHost);
    if (result.length !== 0) {
      result = mvelo.util.sortAndDeDup(result);
    }
    return result;
  });
}
