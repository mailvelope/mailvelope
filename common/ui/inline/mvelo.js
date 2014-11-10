
/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

var mvelo = mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = mvelo.ffa || typeof self !== 'undefined' && self.port || !mvelo.crx;
// for fixfox, mvelo.extension is exposed from a content script
mvelo.extension = mvelo.extension || mvelo.crx && chrome.runtime;
// extension.connect shim for Firefox
if (mvelo.ffa) {
  mvelo.extension.connect = function(obj) {
    mvelo.extension._connect(obj);
    obj.events = {};
    var port = {
      postMessage: mvelo.extension.port.postMessage,
      disconnect: mvelo.extension.port.disconnect.bind(null, obj),
      onMessage: {
        addListener: mvelo.extension.port.addListener.bind(null, obj)
      }
    };
    // page unload triggers port disconnect
    window.addEventListener('unload', port.disconnect);
    return port;
  };
}
// for fixfox, mvelo.l10n is exposed from a content script
mvelo.l10n = mvelo.l10n || mvelo.crx && {
  getMessages: function(ids, callback) {
    var result = {};
    ids.forEach(function(id) {
      result[id] = chrome.i18n.getMessage(id);
    });
    callback(result);
  },
  localizeHTML: function(l10n) {
    $('[data-l10n-id]').each(function() {
      var jqElement = $(this);
      var id = jqElement.data('l10n-id');
      var text = l10n ? l10n[id] : chrome.i18n.getMessage(id);
      jqElement.text(text);
    });
  }
};
// min height for large frame
mvelo.LARGE_FRAME = 600;
// frame constants
mvelo.FRAME_STATUS = 'stat';
// frame status
mvelo.FRAME_ATTACHED = 'att';
mvelo.FRAME_DETACHED = 'det';
// key for reference to frame object
mvelo.FRAME_OBJ = 'fra';
// marker for dynamically created iframes
mvelo.DYN_IFRAME = 'dyn';
mvelo.IFRAME_OBJ = 'obj';
// armor header type
mvelo.PGP_MESSAGE = 'msg';
mvelo.PGP_SIGNATURE = 'sig';
mvelo.PGP_PUBLIC_KEY = 'pub';
mvelo.PGP_PRIVATE_KEY = 'priv';
// editor mode
mvelo.EDITOR_WEBMAIL = 'webmail';
mvelo.EDITOR_EXTERNAL = 'external';
mvelo.EDITOR_BOTH = 'both';
// display decrypted message
mvelo.DISPLAY_INLINE = 'inline';
mvelo.DISPLAY_POPUP = 'popup';
// editor type
mvelo.PLAIN_TEXT = 'plain';
mvelo.RICH_TEXT = 'rich';

// random hash generator
mvelo.getHash = function() { return Math.random().toString(36).substr(2, 8); };

mvelo.encodeHTML = function(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
};

mvelo.util = mvelo.util || {};
mvelo.util.extensionColors = [];
mvelo.util.extensionColors.jpg  = "#4ba5cb"; // Images
mvelo.util.extensionColors.png  = "#4ba5cb";
mvelo.util.extensionColors.bmp  = "#4ba5cb";
mvelo.util.extensionColors.tif  = "#4ba5cb";
mvelo.util.extensionColors.tiff = "#4ba5cb";
mvelo.util.extensionColors.jpg  = "#4ba5cb";
mvelo.util.extensionColors.jpeg = "#4ba5cb";
mvelo.util.extensionColors.psd  = "#4ba5cb";
mvelo.util.extensionColors.txt  = "#427bba"; // Text
mvelo.util.extensionColors.doc  = "#427bba";
mvelo.util.extensionColors.docx = "#427bba";
mvelo.util.extensionColors.rtf  = "#427bba";
mvelo.util.extensionColors.pdf  = "#ad1e24";
mvelo.util.extensionColors.html = "#ad1e24";
mvelo.util.extensionColors.htm  = "#ad1e24";
mvelo.util.extensionColors.mov  = "#bc4fa9"; // Video
mvelo.util.extensionColors.avi  = "#bc4fa9";
mvelo.util.extensionColors.wmv  = "#bc4fa9";
mvelo.util.extensionColors.mpeg = "#bc4fa9";
mvelo.util.extensionColors.flv  = "#bc4fa9";
mvelo.util.extensionColors.divx = "#bc4fa9";
mvelo.util.extensionColors.xvid = "#bc4fa9";
mvelo.util.extensionColors.mp3  = "#563b8c"; // Music
mvelo.util.extensionColors.wav  = "#563b8c";
mvelo.util.extensionColors.zip  = "#e7ab30"; // Sonstige
mvelo.util.extensionColors.rar  = "#e7ab30";
mvelo.util.extensionColors.xml  = "#d6732c";
mvelo.util.extensionColors.ppt  = "#d6732c";
mvelo.util.extensionColors.pptx = "#d6732c";
mvelo.util.extensionColors.xls  = "#6ea64e";
mvelo.util.extensionColors.xlsx = "#6ea64e";
mvelo.util.extensionColors.exe  = "#4b4a4a";
mvelo.util.extensionColors.unknown = "#8a8a8a"; // Unbekannt

mvelo.util.getExtensionColor = function(fileExt) {
  var color = mvelo.util.extensionColors[fileExt];
  if (color === undefined) {
    color = mvelo.util.extensionColors.unknown;
  }
  return color;
};

mvelo.util.extractFileNameWithoutExt = function(fileName) {
  var indexOfDot = fileName.lastIndexOf(".");
  if(indexOfDot > 0 ) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else if(indexOfDot === 0) { // case ".txt"
    return "";
  } else {
    return fileName;
  }
};

mvelo.util.extractFileExtension = function(fileName) {
  var lastindexDot = fileName.lastIndexOf(".");
  if (lastindexDot < 0) { // no extension
    return "";
  } else {
    return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
  }
};

if (typeof exports !== 'undefined') {
  exports.mvelo = mvelo;
}