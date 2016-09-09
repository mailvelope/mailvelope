
'use strict';

var Cc = require('chrome').Cc;
var Ci = require('chrome').Ci;
var utils = require('sdk/window/utils');

var promptSvc = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

exports.confirm = function(title, text) {
  return promptSvc.confirm(utils.getMostRecentBrowserWindow(), title, text);
};
