'use strict';

//
// Require.js config ... add mock dependencies here
//

require.config({
  baseUrl: '..',
  paths: {
    mvelo: 'common/ui/mvelo',
    parser_rules: 'common/dep/wysihtml5/js/advanced_parser_rules',
    dompurify: 'bower_components/dompurify/src/purify',
    jquery: 'bower_components/jquery/dist/jquery',
    openpgp: 'dep/chrome/openpgpjs/dist/openpgp',
    'lib/json-loader': 'chrome/lib/json-loader',
    'common/lib-mvelo': 'chrome/lib/lib-mvelo',
    'emailjs-mime-builder': 'build/chrome/lib/emailjs-mime-builder',
    'mailreader-parser': 'build/chrome/lib/mailreader-parser',
    'emailjs-mime-codec': 'build/chrome/lib/emailjs-mime-codec',
    'emailjs-mime-types': 'build/chrome/lib/emailjs-mime-types',
    'emailjs-punycode': 'build/chrome/lib/emailjs-punycode',
    'emailjs-addressparser': 'build/chrome/lib/emailjs-addressparser',
    'emailjs-mime-parser': 'build/chrome/lib/emailjs-mime-parser',
    'emailjs-stringencoding': 'build/chrome/lib/emailjs-stringencoding'
  },
  shim: {
    'mvelo': {
      exports: 'mvelo'
    },
    'parser_rules': {
      exports: 'wysihtml5ParserRules'
    }
  }
});

//
// AMD unit tests ... add unit tests here
//

define([
  'common/lib/controller/main.controller', // required to bootstrap dependency tree
  'test/common/lib/controller/sub.controller-test',
  'test/common/lib/controller/encrypt.controller-test',
  'test/common/lib/controller/editor.controller-test',
  'test/common/lib/keyserver-test',
  'test/common/lib/keyring-test',
], function() {
  mocha.run();
});
