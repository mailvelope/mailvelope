
'use strict';

var path = require('path');
var common = require('./webpack.common');
var pjson = require('../package.json');

const entry = './src/firefox/lib/main.js';
const output = {
  path: path.resolve('./build/firefox/lib'),
  pathinfo: true,
  filename: 'main.bundle.js',
  libraryTarget: 'commonjs2'
};
const externals = [/sdk\//, 'chrome'];
const resolve = {
  modules: ["bower_components", "node_modules"],
  alias: {
    'lib-mvelo': path.resolve('./src/firefox/lib/lib-mvelo'),
    openpgp: path.resolve('./dep/firefox/openpgpjs/dist/openpgp'),
    'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
    'emailjs-stringencoding': path.resolve('./src/firefox/lib/emailjs-stringencoding'),
    window: path.resolve('./src/firefox/lib/window')
  }
};

const prod = {

  entry,
  output,
  resolve,
  externals,

  module: {
    rules: [common.replaceVersion(pjson.version)]
  },

  plugins: common.plugins('production')

};

const dev = {

  // only source-map type 'eval' working in Firefox
  //devtool: 'cheap-source-map',

  entry,
  output,
  resolve,
  externals,

  module: {
    rules: [common.replaceVersion(pjson.version + ' build: ' + (new Date()).toISOString().slice(0, 19))]
  },

  plugins: common.plugins('development')

};

module.exports = [
  require('./webpack.app').dev,
  require('./webpack.cs').dev,
  ...require('./webpack.comp').dev,
  dev,
];

module.exports.prod = prod;
module.exports.dev = dev;
