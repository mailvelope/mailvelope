/* eslint strict: 0 */
'use strict';

//
// Polyfills and globals required for tests
//

/* eslint-disable */

if (window.initMochaPhantomJS) {
  window.initMochaPhantomJS();
}
mocha.setup('bdd');

var expect = chai.expect;
chai.config.includeStack = true;

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
  getMessage: function() {
    return '';
  }
};
