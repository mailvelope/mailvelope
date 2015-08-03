'use strict';

var addonWindow = require('sdk/addon/window');
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

LocalStorage.prototype.removeItem = function(keyStr) {
  delete this.storage[keyStr];
};

exports.crypto = addonWindow.window.crypto;

exports.atob = addonWindow.window.atob.bind(addonWindow.window);

exports.localStorage = new LocalStorage();
