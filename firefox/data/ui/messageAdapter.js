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

mvelo.ffa = true;

(function() {

  var eventIndex = 1;

  mvelo.extension = {
    _dataPath: self.options.data_path,
    sendMessage: function(message, response) {
      //console.log('message adapter: sendMessage', message.event);
      if (response !== undefined) {
        message.response = 'resp' + eventIndex++;
        self.port.once(message.response, response);
      }
      self.port.emit('message-event', message);
    },
    onMessage: {
      addListener: function(listener) {
        self.port.on('message-event', listener);
      }
    },
    connect: function(obj) {
      self.port.emit('connect', obj.name);
      return new Port(obj.name);
    },
    getURL: function(path) {
      return this._dataPath + path;
    }
  }

  mvelo.__exposedProps__ = { extension : "r" }

  function Port(portName) {
    var name = portName;
    var events = {};

    this.postMessage = function(message) {
      //console.log('postmessage', name, message.event);
      self.port.emit('port-message', message);
    };

    this.disconnect = function() {
      console.log('disconnect called');
      // remove events
      for (var ev in events) {
        if (events.hasOwnProperty(ev)) {
          self.port.removeListener(ev, events[ev]);
        }
      }
      self.port.emit('disconnect', name);
    };

    this.onMessage = {
      addListener: function(listener) {
        var eventName = 'port-message' + '.' + name; 
        self.port.on(eventName, listener);
        events[eventName] = listener;
      }
    }
    // page unload triggers port disconnect
    window.addEventListener('unload', this.disconnect);

  }

  // expose mvelo.extension to content script
  if (self.options.expose_messaging) {
    window.wrappedJSObject.mvelo = mvelo;
  }

}());
