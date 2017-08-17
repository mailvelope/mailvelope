/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from 'lib-mvelo';
import * as  model from '../modules/pgpModel';
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
import AppController from './app.controller';

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
sub.factory.register('app',                 AppController);

export function init() {
  return model.init()
  .then(initMessageListener);
}

function initMessageListener() {
  chrome.runtime.onMessage.addListener(handleMessageEvent);
}

function handleMessageEvent(request, sender, sendResponse) {
  //console.log('controller: handleMessageEvent', request);
  if (request.api_event) {
    return handleApiEvent(request, sender, sendResponse);
  }
  switch (request.event) {
    case 'browser-action':
      onBrowserAction(request.action);
      break;
    case 'get-prefs':
      request.prefs = prefs.prefs;
      sendResponse(request);
      break;
    case 'get-ui-log':
      request.secLog = uiLog.getLatest(request.securityLogLength);
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
    case 'activate':
      prefs.update({main_active: true})
      .then(() => {
        postToNodes(sub.getByMainType('mainCS'), {event: 'on'});
      });
      sendResponse();
      break;
    case 'deactivate':
      prefs.update({main_active: false})
      .then(() => {
        postToNodes(sub.getByMainType('mainCS'), {event: 'off'});
        reloadFrames();
      });
      sendResponse();
      break;
  }
}

function destroyNodes(subControllers) {
  postToNodes(subControllers, {event: 'destroy'});
}

function postToNodes(subControllers, msg) {
  subControllers.forEach(subContr => {
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
  let tab;
  mvelo.tabs.getActive()
  .then(active => {
    tab = active;
    if (!tab) {
      throw new Error('No tab found');
    }
    const options = {};
    options.contentScriptFile = ['content-scripts/addToWatchList.js'];
    // inject scan script
    return mvelo.tabs.attach(tab, options);
  })
  .then(scannedHosts => {
    // scanned hosts from iframes currently not used
    if (scannedHosts.length === 0) {
      return;
    }
    const site = model.getHostname(tab.url);
    const slotId = mvelo.util.getHash();
    sub.setAppDataSlot(slotId, site);
    mvelo.tabs.loadOptionsTab(`?slotId=${slotId}#/settings/watchlist/push`);
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
  mvelo.tabs.loadOptionsTab(hash);
}
