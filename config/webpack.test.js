
'use strict';

var common = require('./webpack.common');
var path = require('path');

module.exports = {

  devtool: 'source-map',

  entry: './test/test.js',

  output: {
    path: './build/test',
    pathinfo: true,
    filename: 'test.bundle.js'
  },

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"],
    alias: {
      'lib-mvelo': path.resolve('./src/chrome/lib/lib-mvelo'),
      openpgp: path.resolve('./dep/chrome/openpgpjs/dist/openpgp'),
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/chrome/lib/emailjs-stringencoding')
    }
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    },
    {
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        presets: ['babel-preset-es2015', 'react']
      }
    },
    {
      test: /\.css$/,
      loader: 'style!css?-url'
    }]
  },

  plugins: common.plugins('development')

};
