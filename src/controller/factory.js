/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {parseViewName} from '../lib/util';
import {APP_TOP_FRAME_ID} from '../lib/constants';

import ApiController from './api.controller';
import AppController from './app.controller';
import AuthDomainController from './authDomain.controller';
import DecryptController from './decrypt.controller';
import EditorController from './editor.controller';
import EncryptController from './encrypt.controller';
import EncryptedFormController from './encryptedForm.controller';
import GmailController from './gmail.controller';
import GmailDecryptController from './gmailDecrypt.controller';
import ImportController from './import.controller';
import MainCsController from './mainCs.controller';
import MenuController from './menu.controller';
import PrivateKeyController from './privateKey.controller';
import PwdController from './pwd.controller';
import VerifyController from './verify.controller';
import {SyncController} from './sync.controller';

/**
 * Register controllers for component types. A component type is the first part of the name of a UI component.
 * The third parameter is for subsequent components that connect to an existing controller.
 */
export function initFactory() {
  register('aFrameGmail',         GmailDecryptController,  ['dDialog']);
  register('api',                 ApiController,           []);
  register('app',                 AppController,           []);
  register('appCont',             AppController,           ['app']);
  register('authDomainDialog',    AuthDomainController,    []);
  register('decryptCont',         DecryptController,       ['dDialog']);
  register('dFrame',              DecryptController,       ['dDialog']);
  register('dFrameGmail',         GmailDecryptController,  ['dDialog']);
  register('editor',              EditorController,        ['editorCont']);
  register('editorCont',          EditorController,        ['editor']);
  register('eFrame',              EncryptController,       []);
  register('encryptedFormCont',   EncryptedFormController, ['encryptedForm']);
  register('gmailInt',            GmailController,         []);
  register('imFrame',             ImportController,        []);
  register('importKeyDialog',     ImportController,        []);
  register('keyBackupCont',       PrivateKeyController,    ['keyBackupDialog', 'backupCodeWindow', 'recoverySheet']);
  register('keyGenCont',          PrivateKeyController,    ['keyGenDialog']);
  register('mainCS',              MainCsController,        []);
  register('menu',                MenuController,          []);
  register('pwdDialog',           PwdController,           []);
  register('restoreBackupCont',   PrivateKeyController,    ['restoreBackupDialog']);
  register('syncHandler',         SyncController,          []);
  register('vFrame',              VerifyController,        ['vDialog', 'dDialog']);
  // Register peer controllers
  registerPeer('editorController', EditorController);
}

const repo = new Map();
const peerRepo = new Map();

export function createController(type, port) {
  verifyCreatePermission(type, port);
  const {contrConstructor} = repo.get(type);
  return new contrConstructor(port);
}

export function createPeerController(type) {
  const contrConstructor = peerRepo.get(type);
  return new contrConstructor();
}

export function getControllerClass(type) {
  return repo.get(type).contrConstructor;
}

/**
 * Register controllers
 * @param  {String} type - The type of the connecting UI component
 * @param  {Class} contrConstructor
 * @param  {Array<String>} allowedSecondaryTypes - UI components that are allowed to connect to the defined controller
 * @return {Object} A controller instance
 */
function register(type, contrConstructor, allowedSecondaryTypes) {
  if (repo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    repo.set(type, {contrConstructor, allowedSecondaryTypes});
  }
}

function registerPeer(type, contrConstructor) {
  if (peerRepo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    peerRepo.set(type, contrConstructor);
  }
}

/**
 * Verify if port is allowed to create controller
 * All web accessible resources should not be allowed to create a controller,
 * therefore only known IDs can be used to create such dialogs
 * @param  {Object} port
 */
function verifyCreatePermission(type, port) {
  if (!repo.has(type)) {
    // view types not registered in repo are not allowed to create controller
    throw new Error(`No controller found for view type: ${type}`);
  }
  if (!port) {
    return;
  }
  if (type === 'editor') {
    throw new Error('Editor view not allowed to directly create controller.');
  }
  if (type === 'app') {
    const sender = parseViewName(port.name);
    if (sender.id !== APP_TOP_FRAME_ID) {
      throw new Error('App view in embedded frame not allowed to directly create controller.');
    }
  }
}

export function verifyConnectPermission(type, sender) {
  if (type === sender.type) {
    return;
  }
  const {allowedSecondaryTypes} = repo.get(type);
  if (!allowedSecondaryTypes.includes(sender.type)) {
    throw new Error(`View type ${sender.type} not allowed to connect to controller.`);
  }
}

export function isMainComponentType(type, controller) {
  for (const entry of repo.entries()) {
    if (entry[0] === type && entry[1].contrConstructor === controller.constructor) {
      return true;
    }
  }
}
