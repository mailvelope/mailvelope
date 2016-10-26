
'use strict';

var webpack = require('webpack');
var path = require('path');

module.exports = {

  entry: ['./src/app/app.js'],

  output: {
    path: './build/tmp/app',
    pathinfo: true,
    filename: 'app.bundle.js'
  },

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"],
    alias: {
      'react': path.resolve('./node_modules/react/dist/react.min'),
      'react-dom': path.resolve('./node_modules/react-dom/dist/react-dom.min')
    }
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        presets: ['react'],
        plugins: ['babel-plugin-transform-es2015-modules-commonjs',
                  'transform-es2015-parameters',
                  'transform-es2015-destructuring'
        ]
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
        'NODE_ENV': JSON.stringify('production')
      }
    })
  ]

};
