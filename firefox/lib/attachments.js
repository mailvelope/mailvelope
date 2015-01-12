/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2014  Mailvelope Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const Cc = require('chrome').Cc;
const Ci = require('chrome').Ci;
var utils = require('sdk/window/utils');
var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
var dirSeparator = (require("sdk/system/runtime").OS.toLowerCase().indexOf("win") != -1) ? "\\" : "/";
var l10nGet = require("sdk/l10n").get;

var fileExistsCounter;

function saveAs(filename, content) {
  var nsIFilePicker = Ci.nsIFilePicker,
      dirPicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  dirPicker.init(utils.getMostRecentBrowserWindow(), l10nGet("save_attachment_as_message"), nsIFilePicker.modeGetFolder);
  var ret = dirPicker.show();
  //dirPicker.displayDirectory = "/home/na/Desktop";
  if (ret == nsIFilePicker.returnOK || ret == nsIFilePicker.returnReplace) {
    checkFileExists(dirPicker.file.path, extractFileNameWithoutExt(filename), extractFileExtension(filename));
    var out = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    out.init(file, 0x20 | 0x02, -1, null); // -1 0664
    var contentString = '';
    for (var i = 0; i < content.length; i++) {
      contentString += String.fromCharCode(content[i]);
    }
    out.write(contentString, contentString.length);
    out.flush();
    out.close();
  }
}

function checkFileExists(folderPath, fileNameWithoutExt, fileExt) {
  if (fileExistsCounter === undefined) {
    fileExistsCounter = 0;
    file.initWithPath(folderPath + dirSeparator + fileNameWithoutExt + "." + fileExt);
  } else {
    file.initWithPath(folderPath + dirSeparator + fileNameWithoutExt + "(" + fileExistsCounter + ")." + fileExt);
  }
  if (file.exists()) {
    fileExistsCounter = fileExistsCounter + 1;
    checkFileExists(folderPath, fileNameWithoutExt, fileExt);
  } else {
    file.create(0, -1); // -1 0664
  }
}

function extractFileNameWithoutExt(fileName) {
  var indexOfDot = fileName.lastIndexOf(".");
  if (indexOfDot > 0) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else if (indexOfDot === 0) { // case ".txt"
    return "";
  } else {
    return fileName;
  }
}

function extractFileExtension(fileName) {
  var lastindexDot = fileName.lastIndexOf(".");
  if (lastindexDot < 0) { // no extension
    return "";
  } else {
    return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
  }
}

exports.saveAs = saveAs;
