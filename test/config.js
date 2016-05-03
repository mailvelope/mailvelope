'use strict';

//
// Polyfills and globals required for tests
//

mocha.setup('bdd');
var expect = chai.expect;
chai.config.includeStack = true;

window.ES6Promise.polyfill(); // load ES6 Promises polyfill

function resolves(val) { return new Promise(function(res) { res(val); }); }
function rejects(val) { return new Promise(function(res, rej) { rej(val || new Error()); }); }
