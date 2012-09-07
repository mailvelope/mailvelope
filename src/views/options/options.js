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

var options = {};

(function(public, $) {
  // counter for method ids
  var id = 0;
  // callbacks are stored with id as key and used when message is received
  var callbacks = {};

  function init() {
    window.addEventListener("message", receiveMessage);
    // init event once page is ready
    top.window.postMessage({
      event: "init"
    }, '*');
  }

  // map Date object to this context, otherwise 'instanceof Date' does not work inside Kendo UI
  public.mapDates = function(data) {
    data.forEach(function(value) {
      value.crDate = new Date(value.crDate);
      value.users.forEach(function(user) {
        user.signatures.forEach(function(sig) {
          sig.crDate = new Date(sig.crDate);
        });
      });
    });
    return data;
  }

  public.viewModel = function(method, args, callback) {
    id++;
    if (typeof args === 'function') {
      callback = args;
      args = undefined;
    }
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    top.window.postMessage({
      event: "viewmodel",
      method: method, 
      args: args, 
      id: id, 
      callback: (callback !== undefined)
    }, '*');
  }

  public.sendMessage = function(message, callback) {
    id++;
    if (callback !== undefined) {
      callbacks[id] = callback;
    }
    top.window.postMessage({
      event: "message",
      message: message, 
      id: id
    }, '*');
  }

  public.copyToClipboard = function(text) {
    top.window.postMessage({
      event: "copyToClipboard",
      text: text
    }, '*'); 
  }  

  function receiveMessage(event) {
    switch (event.data.event) {
      case 'viewmodel-response':
        if (callbacks[event.data.id]) {
          callbacks[event.data.id](event.data.result, event.data.error);
          delete callbacks[event.data.id];
        }  
        break;
      case 'message-response':
        if (callbacks[event.data.id]) {
          callbacks[event.data.id](event.data.message);
          delete callbacks[event.data.id];
        }  
        break;
      case 'add-watchlist-item':
        $('#navList a[href="#watchList"]').tab('show');
        watchList.addSite(event.data.site, event.data.hosts);
        break;
      case 'remove-watchlist-item':
        $('#navList a[href="#watchList"]').tab('show');
        watchList.removeSite(event.data.site);
        break;
    }
    
  }

  $(document).ready(init);

}(options, jQuery));