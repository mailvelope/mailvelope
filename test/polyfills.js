/* eslint-disable */
'use strict';

//
// Polyfills and globals required for tests
//

window.chrome = window.chrome || {};

window.chrome.runtime = window.chrome.runtime || {};

window.chrome.runtime.getURL = function(name) {
  return location.href.split('/test/')[0] + '/' + name;
};

window.chrome.runtime.onMessage = {
  addListener: function() {}
};

window.chrome.runtime.connect = function() {
  return {
    onMessage: {
      addListener: function() {}
    },
    onDisconnect: {
      addListener: function() {}
    },
    postMessage: function() {}
  };
};

window.chrome.i18n = {
  getMessage: function(id) {
    return id;
  }
};

window.chrome.browserAction = window.chrome.browserAction || {};

window.chrome.browserAction.setBadgeText = function(){};

window.chrome.browserAction.setBadgeBackgroundColor = function(){};

