
var window = require('sdk/window/utils').getMostRecentBrowserWindow();

exports.randomBytes = function(size) {
  var buf = new Uint8Array(size);
  window.crypto.getRandomValues(buf);
  return buf;
};
