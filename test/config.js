'use strict';

//
// Polyfills and globals required for tests
//

if (window.initMochaPhantomJS) {
  window.initMochaPhantomJS();
}
mocha.setup('bdd');

var expect = chai.expect; // eslint-disable-line no-unused-vars
chai.config.includeStack = true;

window.ES6Promise.polyfill(); // load ES6 Promises polyfill

// polyfill https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) { // eslint-disable-line no-extend-native
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

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
