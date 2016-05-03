'use strict';

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

require([
  'test/amd-example'
], function() {
  mocha.run();
});
