/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import {handleApiEvent} from './api.controller';

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
import MenuController from './menu.controller';

/**
 * Register controllers for component types. Only the components that first connect to the controller
 * need to be registered, all subsequent components that are created will connect by unique controller id.
 */
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
sub.factory.register('keyBackupCont',       PrivateKeyController);
sub.factory.register('restoreBackupCont',   PrivateKeyController);
sub.factory.register('app',                 AppController);
sub.factory.register('appCont',             AppController);
sub.factory.register('menu',                MenuController);

export async function initController() {
  initMessageListener();
  initSubController();
}

function initSubController() {
  // store incoming connections by name and id
  chrome.runtime.onConnect.addListener(port => {
    //console.log('ConnectionManager: onConnect:', port);
    sub.addPort(port);
    // update active ports on disconnect
    port.onDisconnect.addListener(sub.removePort);
  });
}

function initMessageListener() {
  chrome.runtime.onMessage.addListener(handleMessageEvent);
}

function handleMessageEvent(request, sender, sendResponse) {
  //console.log('controller: handleMessageEvent', request);
  if (request.api_event) {
    return handleApiEvent(request, sender, sendResponse);
  }
}
