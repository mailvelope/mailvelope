/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const externals = {
  jquery: 'jQuery',
  react: 'React',
  'react-dom': 'ReactDOM'
};

function prod(pathname, filename) {
  return {
    ...common.prod,
    entry: `./src/components/${pathname}/${filename}`,
    output: {
      path: path.resolve(`./build/tmp/components/${pathname}`),
      pathinfo: true,
      filename: `${filename}.bundle.js`
    },
    resolve: common.resolve(),
    externals,
    module: {
      rules: [...common.module.react(), ...common.module.css(), ...common.module.scss()]
    }
  };
}

function dev(pathname, filename) {
  return {
    ...prod(pathname, filename),
    mode: 'development',
    devtool: 'inline-cheap-module-source-map'
  };
}

module.exports = [
  dev('action-menu', 'actionMenu'),
  dev('decrypt-message', 'decryptMessageRoot'),
  dev('editor', 'editorRoot'),
  dev('encrypted-form', 'encryptedFormRoot'),
  dev('install-landing-page', 'installLandingPage'),
  dev('import-key', 'importKeyRoot'),
  dev('enter-password', 'passwordDialogRoot'),
  dev('generate-key', 'genKeyRoot'),
  dev('key-backup', 'backupKeyRoot'),
  dev('restore-backup', 'backupRestoreRoot'),
  dev('recovery-sheet', 'recoverySheetRoot'),
  dev('auth-domain', 'authDomainRoot')
];

module.exports.prod = [
  prod('action-menu', 'actionMenu'),
  prod('decrypt-message', 'decryptMessageRoot'),
  prod('editor', 'editorRoot'),
  prod('encrypted-form', 'encryptedFormRoot'),
  prod('install-landing-page', 'installLandingPage'),
  prod('import-key', 'importKeyRoot'),
  prod('enter-password', 'passwordDialogRoot'),
  prod('generate-key', 'genKeyRoot'),
  prod('key-backup', 'backupKeyRoot'),
  prod('restore-backup', 'backupRestoreRoot'),
  prod('recovery-sheet', 'recoverySheetRoot'),
  dev('auth-domain', 'authDomainRoot')
];

module.exports.dev = module.exports;
