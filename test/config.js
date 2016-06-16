'use strict';

//
// Polyfills and globals required for tests
//

if (window.initMochaPhantomJS) {
  window.initMochaPhantomJS();
}
mocha.setup('bdd');

var expect = chai.expect;
chai.config.includeStack = true;

window.ES6Promise.polyfill(); // load ES6 Promises polyfill
function resolves(val) { return Promise.resolve(val); }
function rejects(val) { return Promise.reject(val || new Error()); }

window.chrome = window.chrome || {};
window.chrome.extension = window.chrome.extension || {
  getURL: function(name) {
    return location.href.split('/test/')[0] + '/' + name;
  }
};
window.chrome.i18n = window.chrome.i18n || {
  getMessage: function() {
    return '';
  }
};
