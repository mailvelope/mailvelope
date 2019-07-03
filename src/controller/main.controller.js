/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';

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
import EncryptedFormController from './encryptedForm.controller';
import ApiController from './api.controller';

/**
 * Register controllers for component types. Only the components that first connect to the controller
 * need to be registered, all subsequent components that are created will connect by unique controller id.
 */
sub.factory.register('dFrame',              DecryptController,       ['dDialog']);
sub.factory.register('decryptCont',         DecryptController,       ['dDialog']);
sub.factory.register('eFrame',              EncryptController,       []);
sub.factory.register('imFrame',             ImportController,        []);
sub.factory.register('importKeyDialog',     ImportController,        ['dDialog']);
sub.factory.register('mainCS',              MainCsController,        []);
sub.factory.register('vFrame',              VerifyController,        ['vDialog', 'dDialog']);
sub.factory.register('pwdDialog',           PwdController,           []);
sub.factory.register('editor',              EditorController,        []);
sub.factory.register('editorCont',          EditorController,        ['editor']);
sub.factory.register('syncHandler',         SyncController,          []);
sub.factory.register('keyGenCont',          PrivateKeyController,    ['keyGenDialog']);
sub.factory.register('keyBackupCont',       PrivateKeyController,    ['keyBackupDialog', 'backupCodeWindow']);
sub.factory.register('restoreBackupCont',   PrivateKeyController,    ['restoreBackupDialog']);
sub.factory.register('app',                 AppController,           []);
sub.factory.register('appCont',             AppController,           ['app']);
sub.factory.register('menu',                MenuController,          []);
sub.factory.register('encryptedFormCont',   EncryptedFormController, ['encryptedForm']);
sub.factory.register('api',   ApiController,                         []);

export function initController() {
  // store incoming connections by name and id
  chrome.runtime.onConnect.addListener(port => {
    //console.log('ConnectionManager: onConnect:', port);
    sub.addPort(port);
    // update active ports on disconnect
    port.onDisconnect.addListener(sub.removePort);
  });
}
