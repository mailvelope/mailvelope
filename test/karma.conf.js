// Karma configuration
// Generated on Tue Aug 22 2017 16:23:45 GMT+0200 (CEST)
const path = require('path');
const webpackConfig = require('../config/webpack.test');

module.exports = function(config) {
  if (config.dev) {
    webpackConfig.devtool = 'inline-cheap-module-source-map';
  }
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    // list of files / patterns to load in the browser
    files: [
      {pattern: 'polyfills.js', watched: false},
      {pattern: '../node_modules/babel-polyfill/dist/polyfill.js', watched: false},
      {pattern: '../node_modules/jquery/dist/jquery.js', watched: false},
      {pattern: '../node_modules/bootstrap/dist/js/bootstrap.js', watched: false},
      {pattern: '../node_modules/angular/angular.js', watched: false},
      {pattern: '../node_modules/angular-mocks/angular-mocks.js', watched: false},
      {pattern: '../src/lib/jquery.ext.js', watched: false},
      {pattern: '../node_modules/openpgp/dist/openpgp.worker.js', watched: false, included: false,  nocache: false},
      {pattern: '../node_modules/openpgp/dist/openpgp.js', watched: false, included: false,  nocache: false},
      {pattern: '../src/res/fonts/Courgette-Regular.woff2', watched: false, included: false,  nocache: false},
      // add files to be tested here
      'app/**/*.js',
      'components/**/*.js',
      'content-scripts/**/*.js',
      'controller/**/*.js',
      'lib/**/*.js',
      'modules/**/*.js'
    ],

    // list of files to exclude
    exclude: [
    ],

    proxies: {
      '/dep/openpgp.worker.js': `/absolute${path.resolve('./node_modules/openpgp/dist/openpgp.worker.js')}`,
      '/dep/openpgp.js': `/absolute${path.resolve('./node_modules/openpgp/dist/openpgp.js')}`,
      '/res/fonts/Courgette-Regular.woff2': `/absolute${path.resolve('./src/res/fonts/Courgette-Regular.woff2')}`
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '**/*.js': ['webpack', 'sourcemap'],
      '**/*.css': ['webpack', 'sourcemap'],
      '**/*.less': ['webpack', 'sourcemap'],
    },

    webpack: webpackConfig,

    webpackMiddleware: {
      // webpack-dev-middleware configuration
      // i. e.
      stats: 'errors-only'
    },

    // test results reporter to use
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // web server port
    port: 9876,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless', 'ChromeHeadlessNoSandbox'],
    browserConsoleLogOptions: {level: config.dev ? 'debug' : 'warn', format: '%b %T: %m', terminal: true},
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox --disable-gpu']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: 1
  });
};
