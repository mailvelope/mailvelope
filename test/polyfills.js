/* eslint-disable */
'use strict';

//
// Polyfills and globals required for tests
//

window.chrome = window.chrome || {};

window.chrome.runtime = window.chrome.runtime || {id: 'kajibbejlbohfaggdiogboambcijhkke'};

window.chrome.runtime.getURL = function(name) {
  return location.href.split('/test/')[0] + '/' + name;
};

window.chrome.runtime.getManifest = function() {
  return {oauth2: {client_id: '123'}};
};

(function() {
  const listeners = [];

  window.chrome.runtime.onConnect = {
    addListener: function(listener) {
      console.log("polyfill add listener")
      console.debug(listener)
      listeners.push(listener);
    }
  };

  window.chrome.runtime.connect = function({name}) {
    console.log("polyfill connect " + name)
    const message_listeners = [];
    const disconnect_listeners = [];
    const reply_listeners = [];
    const port = {
      name,
      onMessage: {
        addListener: function(listener) {
          console.log("polyfill add message listener")
          console.debug(listener)
          message_listeners.push(listener);
        }
      },
      onDisconnect: {
        addListener: function(listener) {
          disconnect_listeners.push(listener);
        }
      },
      postMessage: function(message) {
        console.log("polyfill reply message")
        console.debug(message)
        for (const listener of reply_listeners) {
          listener(message);
        };
      }
    };
    for (const listener of listeners) {
      listener(port);
    };

    return {
      onMessage: {
        addListener: function(listener) {
          console.log("polyfill add reply listener")
          console.debug(listener)
          reply_listeners.push(listener);
        }
      },
      onDisconnect: {
        addListener: function(listener) {
          disconnect_listeners.push(listener);
        }
      },
      postMessage: function(message) {
        console.log("polyfill post message")
        console.debug(message)
        for (const listener of message_listeners) {
          listener(message);
        };
      }
    }

  }
})();

window.chrome.i18n = {
  getMessage: function(id) {
    return id;
  }
};

window.chrome.browserAction = window.chrome.browserAction || {};

window.chrome.browserAction.setBadgeText = function(){};

window.chrome.browserAction.setBadgeBackgroundColor = function(){};

