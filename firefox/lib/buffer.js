
'use strict';

var base64 = require('sdk/base64');

function Buffer(str, encoding) {
  this.str = str;
}

Buffer.prototype.toString = function(encoding) {
  return base64.encode(this.str, 'utf-8');
};

exports.Buffer = Buffer;
