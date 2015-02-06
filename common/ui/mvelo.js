
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

/* jshint strict: false */

var mvelo = mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = mvelo.ffa || typeof self !== 'undefined' && self.port || !mvelo.crx;
// for fixfox, mvelo.extension is exposed from a content script

mvelo.getFirefoxVersion = function() {
  return parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("Firefox/") + 8, navigator.userAgent.length));
};

mvelo.extension = mvelo.extension || mvelo.crx && chrome.runtime;
// extension.connect shim for Firefox
if (mvelo.ffa && mvelo.extension) {
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

mvelo.appendTpl = function($element, path) {
  if (mvelo.ffa && !/^resource/.test(document.location.protocol)) {
    return new Promise(function(resolve, reject) {
      mvelo.data.load(path, function(result) {
        $element.append($.parseHTML(result));
        resolve($element);
      });
    });
  } else {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.open('GET', path);
      req.responseType = 'text';
      req.onload = function() {
        if (req.status == 200) {
          $element.append($.parseHTML(req.response));
          resolve($element);
        } else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = function() {
        reject(new Error("Network Error"));
      };
      req.send();
    });
  }
};

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

mvelo.util = {};

mvelo.util.sortAndDeDup = function(unordered, compFn) {
  var result = [];
  var prev = -1;
  unordered.sort(compFn).forEach(function(item) {
    var equal = (compFn !== undefined && prev !== undefined) ? compFn(prev, item) === 0 : prev === item;
    if (!equal) {
      result.push(item);
      prev = item;
    }
  });
  return result;
};

// random hash generator
mvelo.util.getHash = function() {
  var result = '';
  var buf = new Uint16Array(6);
  if (typeof window !== 'undefined') {
    window.crypto.getRandomValues(buf);
  } else {
    mvelo.util.getDOMWindow().crypto.getRandomValues(buf);
  }
  for (var i = 0; i < buf.length; i++) {
    result += buf[i].toString(16);
  }
  return result;
};

mvelo.util.encodeHTML = function(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\//g, "&#x2F;");
};

mvelo.util.decodeQuotedPrint = function(armored) {
  return armored
    .replace(/=3D=3D\s*$/m, "==")
    .replace(/=3D\s*$/m, "=")
    .replace(/=3D(\S{4})\s*$/m, "=$1");
};

mvelo.util.getExtensionClass = function(fileExt) {
  var extClass = "";
  if (fileExt !== undefined) {
    extClass = "ext-color-" + fileExt;
  }
  return extClass;
};

mvelo.util.extractFileNameWithoutExt = function(fileName) {
  var indexOfDot = fileName.lastIndexOf(".");
  if (indexOfDot > 0) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else if (indexOfDot === 0) { // case ".txt"
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

mvelo.util.showSecurityBackground = function() {
  mvelo.extension.sendMessage({event: "get-security-background"}, function(background) {
    var bgndColor = background.color; //"#f5f5f5";
    var color = background.iconColor; //"#e9e9e9;";
    var scale = background.scaling; //1.5;
    var rotationDeg = background.angle; //45;
    var width =  background.width * scale; //40;
    var height = background.height * scale; //20;

    var secBgndIcon = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="' + width + 'px" height="' + height + 'px" viewBox="0 0 27 27"><path transform="rotate(' + rotationDeg + ' 14 14)" style="fill: ' + color + ';" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>';

    bgndColor = "transparent";
    color = "#888888";
    rotationDeg = 0;
    width =  "100%";
    height = "100%";

    var lockIcon = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="' + width + 'px" height="' + height + 'px" viewBox="0 0 27 27"><path transform="rotate(' + rotationDeg + ' 14 14)" style="fill: ' + color + ';" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>';

    //var secText  = "Mailvelope";
    //var opacity = "0.9";
    //var secBgndText = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="250" height="60" id="svg2"><g transform="translate(0,-992.36218)" id="layer1"><text x="17.531542" y="1033.6388" id="text2985" xml:space="preserve" style="font-size:40px;font-style:normal;font-weight:normal;line-height:125%;letter-spacing:0px;word-spacing:0px;fill:#000000;fill-opacity:1;stroke:none;font-family:Sans" ><tspan x="17.531542" y="1033.6388" id="tspan2987"  style="fill:' + color + ';fill-rule:evenodd;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-family:Courgette;" fill-opacity="' + opacity + '">' + secText + '</tspan></text></g></svg>';

    var secureStyle = ".secureBackground { background-color: " + bgndColor + "; background-image: url(data:image/svg+xml;base64," + btoa(secBgndIcon) + "); }";
    var mmodalStyle = ""; //".modal-body { background-color: " + bgndColor + "; background-image: url(data:image/svg+xml;base64," + btoa(secBgndIcon) + "); }";
    var lockButton = ".lockBtnIcon { width: 30px !important; height: 30px; margin-right: -44px; background-size: 100% auto; background-repeat: no-repeat;background-image: url(data:image/svg+xml;base64," + btoa(lockIcon) + "); }";

    $('head').append($("<style>").text(secureStyle + mmodalStyle + lockButton));
  });

  if (typeof exports !== 'undefined') {
    exports.mvelo = mvelo;
  }

};
