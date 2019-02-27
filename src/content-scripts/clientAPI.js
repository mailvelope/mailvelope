/**
 * Copyright (C) 2014-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import $ from 'jquery';
import {PGP_MESSAGE, PGP_SIGNATURE, PGP_PUBLIC_KEY, PGP_PRIVATE_KEY, KEYRING_DELIMITER} from '../lib/constants';
import {MvError, getHash, mapError} from '../lib/util';
import EventHandler from '../lib/EventHandler';
import {prefs, host, getMessageType} from './main';
import {checkTypes} from './clientAPITypeCheck';
import DecryptContainer from './decryptContainer';
import EditorContainer from './editorContainer';
import EncryptedFormContainer from './encryptedFormContainer';
import AppContainer from './appContainer';
import KeyGenContainer from './keyGenContainer';
import KeyBackupContainer from './keyBackupContainer';
import RestoreBackupContainer from './restoreBackupContainer';
import SyncHandler from './syncHandler';

const containers = new Map();

// must be a singelton
let syncHandler = null;
let controllerPort = null;
export let clientPort = null;

export function init() {
  const apiTag = document.getElementById('mailvelope-api');
  if (apiTag) {
    if (apiTag.dataset.version !== prefs.version) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mailvelope-disconnect', {detail: {version: prefs.version}}));
      }, 1);
    }
    return;
  }
  if (!window.mailvelope) {
    $('<script/>', {
      id: 'mailvelope-api',
      src: chrome.runtime.getURL('client-API/mailvelope-client-api.js'),
      'data-version': prefs.version
    }).appendTo($('head'));
  }
  controllerPort = EventHandler.connect(`api-${getHash()}`);
  const port = {
    onMessage: {
      addListener(listener) {
        window.addEventListener('message', event => {
          if (event.origin !== window.location.origin ||
              event.data.mvelo_extension ||
              !event.data.mvelo_client) {
            return;
          }
          const {mvelo_client, ...data} = event.data;
          try {
            checkTypes(data);
            if (data.identifier) {
              if (data.identifier.includes(KEYRING_DELIMITER)) {
                throw new MvError('Identifier invalid.', 'INVALID_IDENTIFIER');
              }
              data.keyringId = host + KEYRING_DELIMITER + data.identifier;
            }
            listener(data);
          } catch (e) {
            if (data._reply) {
              port.postMessage({...data, event: '_reply', error: mapError(e)});
            } else {
              throw e;
            }
          }
        });
      }
    },
    postMessage(options) {
      options.mvelo_extension = true;
      window.postMessage(options, window.location.origin);
    }
  };
  clientPort = new EventHandler(port);
  registerClientEventHandler();
}

function registerClientEventHandler() {
  clientPort.on('get-version', getVersion);
  clientPort.on('get-keyring', getKeyring);
  clientPort.on('create-keyring', createKeyring);
  clientPort.on('display-container', displayContainer);
  clientPort.on('editor-container', editorContainer);
  clientPort.on('settings-container', settingsContainer);
  clientPort.on('open-settings', openSettings);
  clientPort.on('key-gen-container', keyGenContainer);
  clientPort.on('key-backup-container', keyBackupContainer);
  clientPort.on('restore-backup-container', restoreBackupContainer);
  clientPort.on('restore-backup-isready', restoreBackupIsReady);
  clientPort.on('keybackup-popup-isready', keyBackupPopupIsReady);
  clientPort.on('generator-generate', generatorGenerate);
  clientPort.on('generator-generate-confirm', generatorConfirm);
  clientPort.on('generator-generate-reject', generatorReject);
  clientPort.on('has-private-key', hasPrivateKey);
  clientPort.on('editor-encrypt', editorEncrypt);
  clientPort.on('editor-create-draft', editorCreateDraft);
  clientPort.on('query-valid-key', validKeyForAddress);
  clientPort.on('export-own-pub-key', exportOwnPublicKey);
  clientPort.on('import-pub-key', importPublicKey);
  clientPort.on('lookup-pub-key', lookupPublicKey);
  clientPort.on('process-autocrypt-header', processAutocryptHeader);
  clientPort.on('set-logo', setLogo);
  clientPort.on('add-sync-handler', addSyncHandler);
  clientPort.on('sync-handler-done', syncHandlerDone);
  clientPort.on('encrypted-form-container', encryptedFormContainer);
}

function getVersion() {
  const [version] = prefs.version.match(/^\d{1,2}\.\d{1,2}\.\d{1,2}/);
  return version;
}

function getKeyring({keyringId}) {
  return controllerPort.send('get-keyring', {keyringId});
}

function createKeyring({keyringId}) {
  return controllerPort.send('create-keyring', {keyringId});
}

function displayContainer({selector, armored, keyringId, options = {}}) {
  let container;
  switch (getMessageType(armored)) {
    case PGP_MESSAGE:
      container = new DecryptContainer(selector, keyringId, options);
      break;
    case PGP_SIGNATURE:
      throw new MvError('PGP signatures not supported.', 'WRONG_ARMORED_TYPE');
    case PGP_PUBLIC_KEY:
      throw new MvError('PGP keys not supported.', 'WRONG_ARMORED_TYPE');
    default:
      throw new MvError('No valid armored block found.', 'WRONG_ARMORED_TYPE');
  }
  return container.create(armored);
}

function editorContainer({selector, keyringId, options = {}}) {
  if (options.quotedMailIndent === undefined && !options.armoredDraft) {
    options.quotedMailIndent = true;
  }
  if (options.quota) {
    // kilobyte -> byte
    options.quota = parseInt(options.quota) * 1024;
  }
  const container = new EditorContainer(selector, keyringId, options);
  containers.set(container.id, container);
  return container.create();
}

async function settingsContainer({selector, keyringId, options = {}}) {
  options.hasPrivateKey = await controllerPort.send('has-private-key', {keyringId});
  const container = new AppContainer(selector, keyringId, options);
  containers.set(container.id, container);
  return container.create();
}

function openSettings({keyringId}) {
  return controllerPort.send('open-settings', {keyringId});
}

function keyGenContainer({selector, keyringId, options = {}}) {
  options.keySize = options.keySize || 2048;
  const container = new KeyGenContainer(selector, keyringId, options);
  containers.set(container.id, container);
  return container.create();
}

function keyBackupContainer({selector, keyringId, options = {}}) {
  const container = new KeyBackupContainer(selector, keyringId, options);
  containers.set(container.id, container);
  return container.create();
}

function restoreBackupContainer({selector, keyringId, options = {}}) {
  const container = new RestoreBackupContainer(selector, keyringId, options);
  containers.set(container.id, container);
  return container.create();
}

function restoreBackupIsReady({restoreId}) {
  return containers.get(restoreId).restoreBackupReady();
}

function keyBackupPopupIsReady({popupId}) {
  return containers.get(popupId).keyBackupDone();
}

function generatorGenerate({generatorId, confirmRequired}) {
  return containers.get(generatorId).generate(confirmRequired);
}

function generatorConfirm({generatorId}) {
  containers.get(generatorId).confirm();
}

function generatorReject({generatorId}) {
  containers.get(generatorId).reject();
}

function hasPrivateKey({keyringId, fingerprint}) {
  return controllerPort.send('has-private-key', {keyringId, fingerprint});
}

function editorEncrypt({editorId, recipients}) {
  return containers.get(editorId).encrypt(recipients);
}

function editorCreateDraft({editorId}) {
  return containers.get(editorId).createDraft();
}

function validKeyForAddress({keyringId, recipients}) {
  return controllerPort.send('query-valid-key', {keyringId, recipients});
}

function exportOwnPublicKey({keyringId, emailAddr}) {
  return controllerPort.send('export-own-pub-key', {keyringId, emailAddr});
}

function importPublicKey({keyringId, armored}) {
  switch (getMessageType(armored)) {
    case PGP_PUBLIC_KEY:
      // ok
      break;
    case PGP_PRIVATE_KEY:
      throw new MvError('No import of private PGP keys allowed.', 'WRONG_ARMORED_TYPE');
    default:
      throw new MvError('No valid armored block found.', 'WRONG_ARMORED_TYPE');
  }
  return controllerPort.send('import-pub-key', {keyringId, armored});
}

function lookupPublicKey({keyringId, emailAddr}) {
  return controllerPort.send('lookup-pub-key', {keyringId, emailAddr});
}

function processAutocryptHeader({keyringId, headers}) {
  return controllerPort.send('process-autocrypt-header', {keyringId, headers});
}

function setLogo({keyringId, dataURL, revision}) {
  if (!/^data:image\/png;base64,/.test(dataURL)) {
    throw new MvError('Data URL must start with "data:image/png;base64,".', 'LOGO_INVALID');
  }
  if (dataURL.length > 15 * 1024) {
    throw new MvError('Data URL string size exceeds 15KB limit.', 'LOGO_INVALID');
  }
  return controllerPort.send('set-logo', {keyringId, dataURL, revision});
}

function addSyncHandler({keyringId}) {
  syncHandler = syncHandler || new SyncHandler(keyringId);
  containers.set(syncHandler.id, syncHandler);
  return syncHandler.id;
}

function syncHandlerDone(data) {
  const container = containers.get(data.syncHandlerId);
  container.syncDone(data);
}

function encryptedFormContainer({selector, formHtml, signature}) {
  const container = new EncryptedFormContainer(selector, formHtml, signature);
  containers.set(container.id, container);
  return container.create();
}
