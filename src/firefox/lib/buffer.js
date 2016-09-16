
'use strict';

var base64 = require('sdk/base64');

function Buffer(str) {
  this.str = str;
}

Buffer.prototype.toString = function() {
  return base64.encode(this.str, 'utf-8');
};

exports.Buffer = Buffer;
