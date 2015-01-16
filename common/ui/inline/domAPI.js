/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

mvelo.domAPI.init = function() {
  this.active = mvelo.main.watchList.some(function(site) {
    return site.active && site.frames && site.frames.some(function(frame) {
      var hosts = mvelo.domAPI.matchPattern2RegEx(frame.frame);
      return frame.scan && frame.api && hosts.test(document.location.hostname);
    });
  });
  if (this.active) {
    window.addEventListener('message', mvelo.domAPI.eventListener);
    document.body.dataset.mailvelopeVersion = mvelo.main.prefs.version;
    if (!document.body.dataset.mailvelope) {
      $('<script/>', {
        src: mvelo.extension.getURL('common/client-API/mailvelope-client-api.js')
      }).appendTo($('head'));
    }
  }
};

mvelo.domAPI.matchPattern2RegEx = function(matchPattern) {
  return new RegExp(
    '^' + matchPattern.replace(/\./g, '\\.')
                      .replace(/\*/g, '\\w*')
                      .replace(/\\w\*\\./g, '(\\w+\\.)?') + '$'
  );
};

mvelo.domAPI.postMessage = function(eventName, id, data, error) {
  window.postMessage({
    event: eventName,
    mvelo_extension: true,
    id: id,
    data: data,
    error: error
  }, document.location.origin);
};

mvelo.domAPI.reply = function(id, error, data) {
  if (error) {
    error = { message: error.message || error, code: error.code || 'INTERNAL_ERROR' };
  }
  mvelo.domAPI.postMessage('callback-reply', id, data, error);
};

// default type: string
mvelo.domAPI.dataTypes = {
  recipients: 'array',
  options: 'object'
};

mvelo.domAPI.checkTypes = function(data) {
  if (data.id && typeof data.id !== 'string') {
    throw new Error('Type mismatch: data.id should be of type string.');
  }
  var parameters = Object.keys(data.data);
  for (var i = 0; i < parameters.length; i++) {
    var parameter = parameters[i];
    var dataType = mvelo.domAPI.dataTypes[parameter] || 'string';
    var value = data.data[parameter];
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
      throw new Error('Type mismatch: ' + parameter + ' should be of type ' + dataType + '.');
    }
  }
};

mvelo.domAPI.eventListener = function(event) {
  if (event.origin !== document.location.origin ||
      event.data.mvelo_extension ||
      !event.data.mvelo_client) {
    return;
  }
  //console.log('domAPI eventListener', event.data.event);
  try {
    mvelo.domAPI.checkTypes(event.data);
    var data = event.data.data;
    switch (event.data.event) {
      case 'get-keyring':
        mvelo.domAPI.getKeyring(data.identifier, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'create-keyring':
        mvelo.domAPI.createKeyring(data.identifier, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'display-container':
        mvelo.domAPI.displayContainer(data.selector, data.armored, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'editor-container':
        mvelo.domAPI.editorContainer(data.selector, data.options, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'settings-container':
        mvelo.domAPI.settingsContainer(data.identifier, data.selector, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'editor-encrypt':
        mvelo.domAPI.editorEncrypt(data.editorId, data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'get-key-info':
        mvelo.domAPI.getKeyInfoForAddress(data.identifier, data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'export-own-pub-key':
        mvelo.domAPI.exportOwnPublicKey(data.identifier, data.emailAddr, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      case 'import-pub-key':
        mvelo.domAPI.importPublicKey(data.identifier, data.armored, mvelo.domAPI.reply.bind(null, event.data.id));
        break;
      default:
        console.log('unknown event', event.data.event);
    }
  } catch (err) {
    mvelo.domAPI.reply(event.data.id, err);
  }
};

mvelo.domAPI.getKeyring = function(identifier, callback) {
  // TODO
  callback();
};

mvelo.domAPI.createKeyring = function(identifier, callback) {
  // TODO
  callback();
};

mvelo.domAPI.displayContainer = function(selector, armored, options, callback) {
  var container, error;
  switch (mvelo.main.getMessageType(armored)) {
    case mvelo.PGP_MESSAGE:
      container = new mvelo.DecryptContainer(selector);
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

mvelo.domAPI.editorContainer = function(selector, options, callback) {
  var container = new mvelo.EditorContainer(selector);
  this.containers.set(container.id, container);
  container.create(callback);
};

mvelo.domAPI.settingsContainer = function(identifier, selector, callback) {
  // TODO
  callback();
};

mvelo.domAPI.editorEncrypt = function(editorId, recipients, callback) {
  this.containers.get(editorId).encrypt(recipients, callback);
};

mvelo.domAPI.getKeyInfoForAddress = function(identifier, recipients, callback) {
  mvelo.extension.sendMessage({
    event: 'get-key-info',
    identifier: identifier,
    recipients: recipients
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.exportOwnPublicKey = function(identifier, emailAddr, callback) {
  mvelo.extension.sendMessage({
    event: 'export-own-pub-key',
    identifier: identifier,
    emailAddr: emailAddr
  }, function(result) {
    callback(result.error, result.data);
  });
};

mvelo.domAPI.importPublicKey = function(identifier, armored, callback) {
  // TODO
  callback();
};
