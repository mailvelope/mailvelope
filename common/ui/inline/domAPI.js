/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
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

var mvelo = mvelo || {};

mvelo.domAPI = {};

mvelo.domAPI.active = false;

mvelo.domAPI.containers = new Map();

mvelo.domAPI.host = null;

// must be a singelton
mvelo.syncHandler = null;

mvelo.domAPI.init = function() {
  this.active = mvelo.main.watchList.some(function(site) {
    return site.active && site.frames && site.frames.some(function(frame) {
      var hostRegex = mvelo.util.matchPattern2RegEx(frame.frame);
      var validHost = hostRegex.test(window.location.hostname);
      if (frame.scan && frame.api && validHost) {
        // host = match pattern without *. prefix
        mvelo.domAPI.host = frame.frame.replace(/^\*\./, '');
        return true;
      }
    });
  });
  if (this.active) {
    window.addEventListener('message', mvelo.domAPI.eventListener);
    if (!window.mailvelope) {
      $('<script/>', {
        src: mvelo.extension.getURL('common/client-API/mailvelope-client-api.js')
      }).appendTo($('head'));
    }
  }
};

mvelo.domAPI.postMessage = function(eventName, id, data, error) {
  window.postMessage({
    event: eventName,
    mvelo_extension: true,
    id: id,
    data: data,
    error: error
  }, window.location.origin);
};

mvelo.domAPI.reply = function(id, error, data) {
  if (error) {
    error = { message: error.message || error, code: error.code  || 'INTERNAL_ERROR' };
  }
  mvelo.domAPI.postMessage('callback-reply', id, data, error);
};

mvelo.domAPI.dataTypes = {
  identifier: 'string',
  selector: 'string',
  armored: 'string',
  options: 'object',
  recipients: 'array',
  emailAddr: 'string',
  dataURL: 'string',
  revision: 'number',
  fingerprint: 'string',
  syncHandlerObj: 'object',
  editorId: 'string',
  generatorId: 'string',
  popupId: 'string',
  syncHandlerId: 'string',
  syncType: 'string',
  syncData: 'object',
  error: 'object',
  restoreId: 'string',
  restoreBackup: 'string',
  id: 'string'
};

mvelo.domAPI.optionsTypes = {
  showExternalContent: 'boolean',
  quota: 'number',
  predefinedText: 'string',
  quotedMail: 'string',
  signMsg: 'boolean',
  quotedMailIndent: 'boolean',
  quotedMailHeader: 'string',
  userIds: 'array',
  keySize: 'number',
  initialSetup: 'boolean',
  senderAddress: 'string',
  restorePassword: 'boolean'
};

mvelo.domAPI.checkTypes = function(data) {
  var error;
  if (data.id && typeof data.id !== 'string') {
    error = new Error('Type mismatch: data.id should be of type string.');
    error.code = 'TYPE_MISMATCH';
    throw error;
  }
  if (!data.data) {
    return;
  }
  this.enforceTypeWhitelist(data.data, mvelo.domAPI.dataTypes);
  if (data.data.options && typeof data.data.options === 'object') {
    this.enforceTypeWhitelist(data.data.options, mvelo.domAPI.optionsTypes);
  }
};

mvelo.domAPI.enforceTypeWhitelist = function(data, whitelist) {
  var error;
  var parameters = Object.keys(data) || [];
  for (var i = 0; i < parameters.length; i++) {
    var parameter = parameters[i];
    var dataType = whitelist[parameter];
    var value = data[parameter];
    if (dataType === undefined) {
      console.log('Mailvelope client-API type checker: parameter ' + parameter + ' not accepted.');
      delete data[parameter];
      continue;
    }
    if (value === undefined) {
      continue;
    }
    var wrong = false;
    switch (dataType) {
      case 'array':
        if (!Array.isArray(value)) {
          wrong = true;
        }
        break;
      default:
        if (typeof value !== dataType) {
          wrong = true;
        }
    }
    if (wrong) {
      error = new Error('Type mismatch: ' + parameter + ' should be of type ' + dataType + '.');
      error.code = 'TYPE_MISMATCH';
      throw error;
    }
  }
};

mvelo.domAPI.eventListener = function(event) {
  if (event.origin !== window.location.origin ||
      event.data.mvelo_extension ||
      !event.data.mvelo_client) {
    return;
  }
  //console.log('domAPI eventListener', event.data.event);
  try {
    mvelo.domAPI.checkTypes(event.data);
    var data = event.data.data;
    var keyringId = null;
    if (data && data.identifier) {
      if (data.identifier.indexOf(mvelo.KEYRING_DELIMITER) !== -1) {
        throw {message: 'Identifier invalid.', code: 'INVALID_IDENTIFIER'};
      }
      keyringId = mvelo.domAPI.host + mvelo.KEYRING_DELIMITER + data.identifier;
    }
    switch (event.data.event) {
      case 'get-version':
        mvelo.domAPI.reply(event.data.id, null, mvelo.main.prefs.version);
        break;
      case 'get-keyring':
        mvelo.domAPI.getKeyring(keyringId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'create-keyring':
        mvelo.domAPI.createKeyring(keyringId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'display-container':
        mvelo.domAPI.displayContainer(data.selector, data.armored, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'editor-container':
        mvelo.domAPI.editorContainer(data.selector, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'settings-container':
        mvelo.domAPI.settingsContainer(data.selector, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'open-settings':
        mvelo.domAPI.openSettings(keyringId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'key-gen-container':
        mvelo.domAPI.keyGenContainer(data.selector, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'key-backup-container':
        mvelo.domAPI.keyBackupContainer(data.selector, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'restore-backup-container':
        mvelo.domAPI.restoreBackupContainer(data.selector, keyringId, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'restore-backup-isready':
        mvelo.domAPI.restoreBackupIsReady(data.restoreId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'keybackup-popup-isready':
        mvelo.domAPI.keyBackupPopupIsReady(data.popupId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'generator-generate':
        mvelo.domAPI.generatorGenerate(data.generatorId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'has-private-key':
        mvelo.domAPI.hasPrivateKey(keyringId, data.fingerprint, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'editor-encrypt':
        mvelo.domAPI.editorEncrypt(data.editorId, data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'query-valid-key':
        mvelo.domAPI.validKeyForAddress(keyringId, data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'export-own-pub-key':
        mvelo.domAPI.exportOwnPublicKey(keyringId, data.emailAddr, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'import-pub-key':
        mvelo.domAPI.importPublicKey(keyringId, data.armored, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'set-logo':
        mvelo.domAPI.setLogo(keyringId, data.dataURL, data.revision, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'add-sync-handler':
        mvelo.domAPI.addSyncHandler(keyringId, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'sync-handler-done':
        mvelo.domAPI.syncHandlerDone(data);
        break;
      default:
        console.log('domApi unknown event', event.data.event);
    }
  } catch (err) {
    mvelo.domAPI.reply(event.data.id, err);
  }
};

mvelo.domAPI.getKeyring = function(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'get-keyring',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.createKeyring = function(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'create-keyring',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.displayContainer = function(selector, armored, keyringId, options, callback) {
  var container, error;
  switch (mvelo.main.getMessageType(armored)) {
    case mvelo.PGP_MESSAGE:
      container = new mvelo.DecryptContainer(selector, keyringId, options);
      break;
    case mvelo.PGP_SIGNATURE:
      error = new Error('PGP signatures not supported.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    case mvelo.PGP_PUBLIC_KEY:
      error = new Error('PGP keys not supported.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    default:
      error = new Error('No valid armored block found.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
  }
  container.create(armored, callback);
};

mvelo.domAPI.editorContainer = function(selector, keyringId, options, callback) {
  options = options || {};
  if (options.quotedMailIndent === undefined) {
    options.quotedMailIndent = true;
  }
  if (options.signMsg === undefined) {
    options.signMsg = true;
  }
  if (options.quota) {
    // kilobyte -> byte
    options.quota = parseInt(options.quota) * 1024;
  }
  var container = new mvelo.EditorContainer(selector, keyringId, options);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.settingsContainer = function(selector, keyringId, options, callback) {
  var container = new mvelo.OptionsContainer(selector, keyringId, options);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.openSettings = function(keyringId, callback) {
  mvelo.extension.sendMessage({
    event: 'open-settings',
    api_event: true,
    keyringId: keyringId
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.keyGenContainer = function(selector, keyringId, options, callback) {
  options = options || {};
  if (options.keySize === undefined) {
    options.keySize = 2048;
  }
  var container = new mvelo.KeyGenContainer(selector, keyringId, options);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.keyBackupContainer = function(selector, keyringId, options, callback) {
  options = options || {};
  var container = new mvelo.KeyBackupContainer(selector, keyringId, options);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.restoreBackupContainer = function(selector, keyringId, options, callback) {
  options = options || {};
  var container = new mvelo.RestoreBackupContainer(selector, keyringId, options);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.restoreBackupIsReady = function(restoreId, callback) {
  this.containers.get(restoreId).restoreBackupReady(callback);
};

mvelo.domAPI.keyBackupPopupIsReady = function(popupId, callback) {
  this.containers.get(popupId).keyBackupDone(callback);
};

mvelo.domAPI.generatorGenerate = function(generatorId, callback) {
  this.containers.get(generatorId).generate(callback);
};

mvelo.domAPI.hasPrivateKey = function(keyringId, fingerprint, callback) {
  mvelo.extension.sendMessage({
    event: 'has-private-key',
    api_event: true,
    keyringId: keyringId,
    fingerprint: fingerprint
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.editorEncrypt = function(editorId, recipients, callback) {
  this.containers.get(editorId).encrypt(recipients, callback);
};

mvelo.domAPI.validKeyForAddress = function(keyringId, recipients, callback) {
  mvelo.extension.sendMessage({
    event: 'query-valid-key',
    api_event: true,
    keyringId: keyringId,
    recipients: recipients
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.exportOwnPublicKey = function(keyringId, emailAddr, callback) {
  mvelo.extension.sendMessage({
    event: 'export-own-pub-key',
    api_event: true,
    keyringId: keyringId,
    emailAddr: emailAddr
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.importPublicKey = function(keyringId, armored, callback) {
  var error;
  switch (mvelo.main.getMessageType(armored)) {
    case mvelo.PGP_PUBLIC_KEY:
      // ok
      break;
    case mvelo.PGP_PRIVATE_KEY:
      error = new Error('No import of private PGP keys allowed.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
    default:
      error = new Error('No valid armored block found.');
      error.code = 'WRONG_ARMORED_TYPE';
      throw error;
  }
  mvelo.extension.sendMessage({
    event: 'import-pub-key',
    api_event: true,
    keyringId: keyringId,
    armored: armored
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.setLogo = function(keyringId, dataURL, revision, callback) {
  var error;
  if (!/^data:image\/png;base64,/.test(dataURL)) {
    error = new Error('Data URL must start with "data:image/png;base64,".');
    error.code = 'LOGO_INVALID';
    throw error;
  }
  if (dataURL.length > 15 * 1024) {
    error = new Error('Data URL string size exceeds 15KB limit.');
    error.code = 'LOGO_INVALID';
    throw error;
  }
  mvelo.extension.sendMessage({
    event: 'set-logo',
    api_event: true,
    keyringId: keyringId,
    dataURL: dataURL,
    revision: revision
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.addSyncHandler = function(keyringId, callback) {
  mvelo.syncHandler = mvelo.syncHandler || new mvelo.SyncHandler(keyringId);
  this.containers.set(mvelo.syncHandler.id, mvelo.syncHandler);

  callback(null, mvelo.syncHandler.id);
};

mvelo.domAPI.syncHandlerDone = function(data) {
  var container = this.containers.get(data.syncHandlerId);

  container.syncDone(data);
};
