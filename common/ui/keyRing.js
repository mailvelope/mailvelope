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

var keyRing = {};

(function(exports, $) {
  // counter for method ids
  var id = 0;
  // callbacks are stored with id as key and used when message is received
  var callbacks = {};
  // event controller
  var event = $('<div/>');

  function init() {
    window.addEventListener("message", receiveMessage);
    // init event once page is ready
    parent.postMessage(JSON.stringify({
      event: "init"
    }), '*');
    // check for native color picker support and load polyfill
    Modernizr.load({
      test: Modernizr.inputtypes.color,
      nope: ['../dep/spectrum/spectrum.js', '../dep/spectrum/spectrum.css']
    });
  }

  exports.viewModel = function(method, args, callback) {
    //console.log('keyRing viewModel() called');
    id++;
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    parent.postMessage(JSON.stringify({
      event: "viewmodel",
      method: method, 
      args: args, 
      id: id, 
      callback: (callback !== undefined)
    }), '*');
  }

  exports.sendMessage = function(message, callback) {
    id++;
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    parent.postMessage(JSON.stringify({
      event: "message",
      message: message, 
      id: id,
      callback: (callback !== undefined)
    }), '*');
  }

  exports.copyToClipboard = function(text) {
    parent.postMessage(JSON.stringify({
      event: "copyToClipboard",
      text: text
    }), '*'); 
  }

  exports.event = event;

  function receiveMessage(msg) {
    //console.log('key ring receiveMessage', JSON.stringify(msg));
    var data = JSON.parse(msg.data);
    switch (data.event) {
      case 'viewmodel-response':
        if (callbacks[data.id]) {
          //console.log('keyRing viewmodel-response', data);
          callbacks[data.id](data.result, data.error);
          delete callbacks[data.id];
        }  
        break;
      case 'message-response':
        if (callbacks[data.id]) {
          callbacks[data.id](data.message);
          delete callbacks[data.id];
        }  
        break;
      case 'add-watchlist-item':
        $('#navList a[href="#watchList"]').tab('show');
        watchList.addSite(data.site, data.hosts);
        break;
      case 'remove-watchlist-item':
        $('#navList a[href="#watchList"]').tab('show');
        watchList.removeSite(data.site);
        break;
    }
    
  }

  $(document).ready(init);

}(keyRing, jQuery));