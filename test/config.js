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
function resolves(val) { return new Promise(function(res) { res(val); }); }
function rejects(val) { return new Promise(function(res, rej) { rej(val || new Error()); }); }

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
