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

mvelo.domAPI.containers = {};

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
    matchPattern.replace('.', '\\.')
                .replace('*', '\\w*')
                .replace('\\w*\\.', '(\\w+\\.)?') + '$');
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
  mvelo.domAPI.postMessage('callback-reply', id, data, error);
};

mvelo.domAPI.eventListener = function(event) {
  if (event.origin !== document.location.origin ||
      event.data.mvelo_extension ||
      !event.data.mvelo_client) {
    return;
  }
  console.log('domAPI eventListener', event.data.event);
  var data = event.data.data;
  switch (event.data.event) {
    case 'display-container':
      mvelo.domAPI.displayContainer(data.selector, data.armored, mvelo.domAPI.reply.bind(null, event.data.id));
      break;
    case 'editor-container':
      mvelo.domAPI.editorContainer(data.selector, mvelo.domAPI.reply.bind(null, event.data.id));
      break;
    case 'editor-encrypt':
      mvelo.domAPI.editorEncrypt(data.editor_id, data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
      break;
    case 'query-valid-key':
      mvelo.domAPI.validKeyForAddress(data.recipients, mvelo.domAPI.reply.bind(null, event.data.id));
      break;
    default:
      console.log('unknown event', event.data.event);
  }
};

mvelo.domAPI.displayContainer = function(selector, armored, callback) {
  var container;
  switch (mvelo.main.getMessageType(armored)) {
    case mvelo.PGP_MESSAGE:
      container = new mvelo.DecryptContainer(selector);
      break;
    case mvelo.PGP_SIGNATURE:
      // TODO
      break;
    case mvelo.PGP_PUBLIC_KEY:
      // TODO
      break;
  }
  container.create(armored, callback);
};

mvelo.domAPI.editorContainer = function(selector, callback) {
  var container = new mvelo.EditorContainer(selector);
  this.containers[container.id] = container;
  container.create(callback);
};

mvelo.domAPI.editorEncrypt = function(editor_id, recipients, callback) {
  this.containers[editor_id].encrypt(recipients, callback);
};

mvelo.domAPI.validKeyForAddress = function(recipients, callback) {
  chrome.extension.sendMessage({
    event: 'query-valid-key',
    recipients: recipients
  }, callback.bind(null, null));
};
