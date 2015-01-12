
'use strict';

var ss = require('sdk/simple-storage');

function LocalStorage() {
  this.storage = ss.storage;
}

LocalStorage.prototype.getItem = function(keyStr) {
  return this.storage[keyStr] || null;
};

LocalStorage.prototype.setItem = function(keyStr, valueStr) {
  this.storage[keyStr] = valueStr;
};

exports.LocalStorage = LocalStorage;
