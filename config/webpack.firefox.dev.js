
'use strict';

var path = require('path');
var webpack = require('webpack');
var pjson = require('../package.json');

module.exports = {

  devtool: 'cheap-module-source-map',

  entry: './src/firefox/lib/main.js',

  output: {
    path: './build/firefox/lib',
    pathinfo: true,
    filename: 'main.bundle.js',
    libraryTarget: 'commonjs2'
  },

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"],
    alias: {
      'lib-mvelo': path.resolve('./src/firefox/lib/lib-mvelo'),
      openpgp: path.resolve('./dep/firefox/openpgpjs/dist/openpgp'),
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/firefox/lib/emailjs-stringencoding'),
      window: path.resolve('./src/firefox/lib/window')
    }
  },

  externals: [
    /sdk\//,
    'chrome'
  ],

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
    }]
  },

  plugins: [
    function() {
      this.plugin('done', function(stats) {
        if (stats.compilation.errors && stats.compilation.errors.length && process.argv.indexOf('--watch') == -1) {
          process.exitCode = 1;
        }
      });
    },
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('development')
      }
    })
  ]

};
