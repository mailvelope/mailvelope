/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

var mvelo = mvelo || {};

// expose mvelo.extension to page script
if (self.options.expose_messaging) {
  if (self.options.browser_version >= 33) {
    mvelo = createObjectIn(unsafeWindow, {defineAs: "mvelo"});
  } else {
    window.unsafeWindow.mvelo = mvelo;
  }
}

(function() {

  var eventIndex = 1;

  mvelo.ffa = true;

  var extension = {
    _dataPath: self.options.data_path,
    onMessage: {},
    port: {}
  };

  function sendMessage(message, response) {
    //console.log('message adapter: sendMessage', message.event);
    if (response !== undefined) {
      message.response = 'resp' + eventIndex++;
      self.port.once(message.response, response);
    }
    self.port.emit('message-event', message);
  }

  function addListener(listener) {
    self.port.on('message-event', listener);
  }

  function _connect(obj) {
    self.port.emit('connect', obj.name);
  }

  function getURL(path) {
    return extension._dataPath + path;
  }

  function postMessage(message) {
    //console.log('postmessage', name, message.event);
    self.port.emit('port-message', message);
  }

  function disconnect(obj) {
    //console.log('disconnect called');
    // remove events
    for (var ev in obj.events) {
      if (obj.events.hasOwnProperty(ev)) {
        self.port.removeListener(ev, obj.events[ev]);
      }
    }
    self.port.emit('disconnect', obj.name);
  }

  function addPortListener(obj, listener) {
    var eventName = 'port-message' + '.' + obj.name;
    self.port.on(eventName, listener);
    obj.events[eventName] = listener;
  }

  var l10n = {};

  function getMessages(ids, callback) {
    mvelo.extension.sendMessage({
      event: 'get-l10n-messages',
      ids: ids
    }, callback);
  }

  function localizeHTML(l10n) {
    if (l10n) {
      $('[data-l10n-id]').each(function() {
        var jqElement = $(this);
        var text = l10n[jqElement.data('l10n-id')];
        jqElement.text(text);
      });
    }
  }

  if (self.options.expose_messaging && self.options.browser_version >= 33) {
    mvelo.extension = cloneInto(extension, mvelo);
    exportFunction(sendMessage, mvelo.extension, {defineAs: "sendMessage", allowCallbacks: true});
    exportFunction(addListener, mvelo.extension.onMessage, {defineAs: "addListener", allowCallbacks: true});
    exportFunction(_connect, mvelo.extension, {defineAs: "_connect"});
    exportFunction(getURL, mvelo.extension, {defineAs: "getURL"});
    exportFunction(postMessage, mvelo.extension.port, {defineAs: "postMessage"});
    exportFunction(disconnect, mvelo.extension.port, {defineAs: "disconnect"});
    exportFunction(addPortListener, mvelo.extension.port, {defineAs: "addListener", allowCallbacks: true});
    mvelo.l10n = cloneInto(l10n, mvelo);
    exportFunction(getMessages, mvelo.l10n, {defineAs: "getMessages", allowCallbacks: true});
    exportFunction(localizeHTML, mvelo.l10n, {defineAs: "localizeHTML"});
  } else {
    mvelo.extension = extension;
    mvelo.extension.sendMessage = sendMessage;
    mvelo.extension.onMessage.addListener = addListener;
    mvelo.extension._connect = _connect;
    mvelo.extension.getURL = getURL;
    mvelo.__exposedProps__ = { extension : "r" };
    mvelo.extension.port.postMessage = postMessage;
    mvelo.extension.port.disconnect = disconnect;
    mvelo.extension.port.addListener = addPortListener;
    mvelo.l10n = l10n;
    mvelo.l10n.getMessages = getMessages;
    mvelo.l10n.localizeHTML = localizeHTML;
  }

}());
