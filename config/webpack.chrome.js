
'use strict';

var path = require('path');
var common = require('./webpack.common');
var pjson = require('../package.json');

const entry = './src/chrome/background.js';
const output = {
  path: './build/chrome',
  pathinfo: true,
  filename: 'background.bundle.js'
};
const resolve = {
  modulesDirectories: ["bower_components", "node_modules"],
  alias: {
    'lib-mvelo': path.resolve('./src/chrome/lib/lib-mvelo'),
    openpgp: path.resolve('./dep/chrome/openpgpjs/dist/openpgp'),
    'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
    'emailjs-stringencoding': path.resolve('./src/chrome/lib/emailjs-stringencoding')
  }
};

const prod = {

  entry,
  output,
  resolve,

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    },
    {
      test: /defaults\.json$/,
      loader: 'string-replace',
      query: {
        search: '@@mvelo_version',
        replace: pjson.version
      }
    }],
    noParse: /openpgp\.js$/
  },

  plugins: common.plugins('production')

};

const dev = {

  devtool: 'cheap-module-source-map',
  entry,
  output,
  resolve,

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    },
    {
      test: /defaults\.json$/,
      loader: 'string-replace',
      query: {
        search: '@@mvelo_version',
        replace: pjson.version + ' build: ' + (new Date()).toISOString().slice(0, 19)
      }
    }],
    noParse: /openpgp\.js$/
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
