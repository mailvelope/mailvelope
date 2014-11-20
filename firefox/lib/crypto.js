
'use strict';

var browserWindow = require('sdk/window/utils').getMostRecentBrowserWindow();

exports.randomBytes = function(size) {
  var buf = new Uint8Array(size);
  browserWindow.crypto.getRandomValues(buf);
  return buf;
};
