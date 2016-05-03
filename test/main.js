'use strict';

//
// Polyfills and globals required for tests
//

ES6Promise.polyfill(); // load ES6 Promises polyfill
mocha.setup('bdd');
var expect = chai.expect;
chai.config.includeStack = true;

function resolves(val) { return new Promise(function(res) { res(val); }); }
function rejects(val) { return new Promise(function(res, rej) { rej(val || new Error()); }); }

//
// Require.js config ... add mock dependencies here
//

require.config({
  baseUrl: '..',
  paths: {
    'openpgp': 'dep/chrome/openpgpjs/dist/openpgp.js'
  },
  shim: {
    'sinon': {
      exports: 'sinon'
    }
  }
});

//
// AMD unit tests ... add unit tests here
//

var AMD_TESTS = [
  'test/amd-example'
];

require(AMD_TESTS, function() {
  mocha.run();
});
