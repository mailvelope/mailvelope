/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

/* eslint strict: 0 */
/* global createObjectIn, unsafeWindow, cloneInto, exportFunction */

var mvelo = mvelo || {}; // eslint-disable-line no-var

// expose mvelo.extension to page script
if (self.options.expose_messaging) {
  mvelo = createObjectIn(unsafeWindow, {defineAs: "mvelo"});
}

(function() {
  let eventIndex = 1;

  mvelo.ffa = true;

  let extension = {
    _dataPath: self.options.data_path,
    _dataPathWebex: self.options.data_path_webex,
    onMessage: {},
    port: {}
  };

  function sendMessage(message, response) {
    //console.log('message adapter: sendMessage', message.event);
    if (response !== undefined) {
      message.response = `resp${eventIndex++}`;
      self.port.once(message.response, response);
    }
    self.port.emit('message-event', message);
  }

  function addListener(listener) {
    self.port.on('message-event', msg => {
      listener(msg, null, msg.response && (respMsg => {
        self.port.emit(msg.response, respMsg);
      }));
    });
  }

  function _connect(obj) {
    self.port.emit('connect', obj.name);
  }

  function getURL(path, webex) {
    if (webex) {
      return extension._dataPathWebex + path;
    }
    return extension._dataPath + path;
  }

  function postMessage(message) {
    //console.log('postmessage', name, message.event);
    self.port.emit('port-message', message);
  }

  function disconnect(obj) {
    // remove events
    for (let ev in obj.events) {
      if (obj.events.hasOwnProperty(ev)) {
        self.port.removeListener(ev, obj.events[ev]);
      }
    }
    self.port.emit('disconnect', obj.name);
  }

  function addPortListener(obj, listener) {
    let eventName = `${'port-message' + '.'}${obj.name}`;
    self.port.on(eventName, listener);
    obj.events[eventName] = listener;
  }

  function addPortDisconnectListener() {
    // currently deactivated, detach event is fired too late: Mailvelope components are already detached from the DOM
    //self.port.on('detach', listener);
  }

  let l10n = {};

  function getMessages(ids, callback) {
    mvelo.extension.sendMessage({
      event: 'get-l10n-messages',
      ids
    }, callback);
  }

  function localizeHTML(l10n, idSelector) {
    let selector = idSelector ? `${idSelector} [data-l10n-id]` : '[data-l10n-id]';
    if (l10n) {
      [].forEach.call(document.querySelectorAll(selector), element => {
        element.textContent = l10n[element.dataset.l10nId] || element.dataset.l10nId;
      });
      [].forEach.call(document.querySelectorAll('[data-l10n-title-id]'), element => {
        element.setAttribute("title", l10n[element.dataset.l10nTitleId] || element.dataset.l10nTitleId);
      });
    } else {
      l10n = [].map.call(document.querySelectorAll(selector), element => element.dataset.l10nId);
      [].map.call(document.querySelectorAll('[data-l10n-title-id]'), element => {
        l10n.push(element.dataset.l10nTitleId);
      });
      getMessages(l10n, result => {
        localizeHTML(result, idSelector);
      });
    }
  }

  let data = {};

  function load(path, callback) {
    mvelo.extension.sendMessage({
      event: 'data-load',
      path
    }, callback);
  }

  if (self.options.expose_messaging) {
    mvelo.extension = cloneInto(extension, mvelo);
    exportFunction(sendMessage, mvelo.extension, {defineAs: "sendMessage", allowCallbacks: true});
    exportFunction(addListener, mvelo.extension.onMessage, {defineAs: "addListener", allowCallbacks: true});
    exportFunction(_connect, mvelo.extension, {defineAs: "_connect"});
    exportFunction(getURL, mvelo.extension, {defineAs: "getURL"});
    exportFunction(postMessage, mvelo.extension.port, {defineAs: "postMessage"});
    exportFunction(disconnect, mvelo.extension.port, {defineAs: "disconnect"});
    exportFunction(addPortListener, mvelo.extension.port, {defineAs: "addListener", allowCallbacks: true});
    exportFunction(addPortDisconnectListener, mvelo.extension.port, {defineAs: "addDisconnectListener", allowCallbacks: true});
    mvelo.l10n = cloneInto(l10n, mvelo);
    exportFunction(getMessages, mvelo.l10n, {defineAs: "getMessages", allowCallbacks: true});
    exportFunction(localizeHTML, mvelo.l10n, {defineAs: "localizeHTML"});
    mvelo.data = cloneInto(data, mvelo);
    exportFunction(load, mvelo.data, {defineAs: "load", allowCallbacks: true});
  } else {
    mvelo.extension = extension;
    mvelo.extension.sendMessage = sendMessage;
    mvelo.extension.onMessage.addListener = addListener;
    mvelo.extension._connect = _connect;
    mvelo.extension.getURL = getURL;
    mvelo.extension.port.postMessage = postMessage;
    mvelo.extension.port.disconnect = disconnect;
    mvelo.extension.port.addListener = addPortListener;
    mvelo.extension.port.addDisconnectListener = addPortDisconnectListener;
    mvelo.l10n = l10n;
    mvelo.l10n.getMessages = getMessages;
    mvelo.l10n.localizeHTML = localizeHTML;
    mvelo.data = data;
    mvelo.data.load = load;
  }
}());
