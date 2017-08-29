/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');
const pjson = require('../package.json');

const entry = './src/background.js';
const output = {
  path: path.resolve('./build/tmp'),
  pathinfo: true,
  filename: 'background.bundle.js'
};
const resolve = {
  modules: ["node_modules"],
  alias: {
    'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
    'emailjs-stringencoding': path.resolve('./src/lib/emailjs-stringencoding')
  }
};

const prod = {
  entry,
  output,
  resolve,
  module: {
    rules: [common.replaceVersion(/defaults\.json$/, pjson.version, true)],
    noParse: /openpgp\.js$/
  },
  plugins: common.plugins('production')
};

const dev = Object.assign(prod, {
  devtool: 'cheap-module-source-map',
  module: {
    rules: [common.replaceVersion(/defaults\.json$/, `${pjson.version} build: ${(new Date()).toISOString().slice(0, 19)}`, true)],
    noParse: /openpgp\.js$/
  },
  plugins: common.plugins('development')
});

module.exports = [dev];

module.exports.prod = prod;
module.exports.dev = dev;
