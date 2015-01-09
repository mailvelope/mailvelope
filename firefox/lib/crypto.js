
'use strict';

var addonWindow = require('sdk/addon/window');

exports.randomBytes = function(size) {
  var buf = new Uint8Array(size);
  addonWindow.window.crypto.getRandomValues(buf);
  return buf;
};
