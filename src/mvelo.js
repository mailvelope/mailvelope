
/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

/* eslint strict: 0 */

var mvelo = typeof window !== 'undefined' && window.mvelo || {};
// chrome extension
mvelo.crx = typeof chrome !== 'undefined';
// firefox addon
mvelo.ffa = mvelo.ffa || typeof self !== 'undefined' && self.port || !mvelo.crx;

/* constants */

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
// display decrypted message
mvelo.DISPLAY_INLINE = 'inline';
mvelo.DISPLAY_POPUP = 'popup';
// editor type
mvelo.PLAIN_TEXT = 'plain';
mvelo.RICH_TEXT = 'rich';
// keyring
mvelo.KEYRING_DELIMITER = '|#|';
mvelo.LOCAL_KEYRING_ID = 'localhost' + mvelo.KEYRING_DELIMITER + 'mailvelope';
// colors for secure background
mvelo.SECURE_COLORS = ['#e9e9e9', '#c0c0c0', '#808080', '#ffce1e', '#ff0000', '#85154a', '#6f2b8b', '#b3d1e3', '#315bab', '#1c449b', '#4c759c', '#1e8e9f', '#93b536'];

mvelo.MAXFILEUPLOADSIZE = 25 * 1024 * 1024;
mvelo.MAXFILEUPLOADSIZECHROME = 20 * 1024 * 1024; // temporal fix due issue in Chrome

mvelo.appendTpl = function($element, path) {
  if (mvelo.ffa && !/^resource/.test(document.location.protocol)) {
    return new Promise(function(resolve) {
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
        reject(new Error('Network Error'));
      };
      req.send();
    });
  }
};

// for fixfox, mvelo.extension is exposed from a content script
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
      },
      onDisconnect: {
        addListener: mvelo.extension.port.addDisconnectListener.bind(null)
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
  localizeHTML: function(l10n, idSelector) {
    var selector = idSelector ? idSelector + ' [data-l10n-id]' : '[data-l10n-id]';
    $(selector).each(function() {
      var jqElement = $(this);
      var id = jqElement.data('l10n-id');
      var text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
      jqElement.text(text);
    });
    $('[data-l10n-title-id]').each(function() {
      var jqElement = $(this);
      var id = jqElement.data('l10n-title-id');
      var text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
      jqElement.attr('title', text);
    });
  }
};

mvelo.util = {};

mvelo.util.sortAndDeDup = function(unordered, compFn) {
  var result = [];
  var sorted = unordered.sort(compFn);
  // remove duplicates
  for (var i = 0; i < sorted.length; i++) {
    if (i === 0 || compFn && compFn(sorted[i - 1], sorted[i]) !== 0 || !compFn && sorted[i - 1] !== sorted[i]) {
      result.push(sorted[i]);
    }
  }
  return result;
};

/**
 * Only deduplicates, does not sort
 * @param  {Array} list   The list of items with duplicates
 * @return {Array}        The list of items without duplicates
 */
mvelo.util.deDup = function(list) {
  var result = [];
  (list || []).forEach(function(i) {
    if (result.indexOf(i) === -1) {
      result.push(i);
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

mvelo.util.decodeHTML = function(html) {
  return String(html)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "\'")
    .replace(/&#x2F;/g, "\/");
};

mvelo.util.decodeQuotedPrint = function(armored) {
  return armored
    .replace(/=3D=3D\s*$/m, "==")
    .replace(/=3D\s*$/m, "=")
    .replace(/=3D(\S{4})\s*$/m, "=$1");
};

mvelo.util.text2html = function(text) {
  return this.encodeHTML(text).replace(/\n/g, '<br>');
};

mvelo.util.html2text = function(html) {
  html = html.replace(/\n/g, ' '); // replace new line with space
  html = html.replace(/(<br>)/g, '\n'); // replace <br> with new line
  html = html.replace(/<\/(blockquote|div|dl|dt|dd|form|h1|h2|h3|h4|h5|h6|hr|ol|p|pre|table|tr|td|ul|li|section|header|footer)>/g, '\n'); // replace block closing tags </..> with new line
  html = html.replace(/<(.+?)>/g, ''); // remove tags
  html = html.replace(/&nbsp;/g, ' '); // replace non-breaking space with whitespace
  html = html.replace(/\n{3,}/g, '\n\n'); // compress new line
  return mvelo.util.decodeHTML(html);
};

/**
 * This function will return the byte size of any UTF-8 string you pass to it.
 * @param {string} str
 * @returns {number}
 */
mvelo.util.byteCount = function(str) {
  return encodeURI(str).split(/%..|./).length - 1;
};

mvelo.util.ab2str = function(buf) {
  var str = '';
  var ab = new Uint8Array(buf);
  var CHUNK_SIZE = Math.pow(2, 16);
  var offset, len, subab;
  for (offset = 0; offset < ab.length; offset += CHUNK_SIZE) {
    len = Math.min(CHUNK_SIZE, ab.length - offset);
    subab = ab.subarray(offset, offset + len);
    str += String.fromCharCode.apply(null, subab);
  }
  return str;
};

mvelo.util.str2ab = function(str) {
  var bufView = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView.buffer;
};

mvelo.util.getExtensionClass = function(fileExt) {
  var extClass = '';
  if (fileExt) {
    extClass = 'ext-color-' + fileExt;
  }
  return extClass;
};

mvelo.util.extractFileNameWithoutExt = function(fileName) {
  var indexOfDot = fileName.lastIndexOf('.');
  if (indexOfDot > 0) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else {
    return fileName;
  }
};

mvelo.util.extractFileExtension = function(fileName) {
  var lastindexDot = fileName.lastIndexOf('.');
  if (lastindexDot <= 0) { // no extension
    return '';
  } else {
    return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
  }
};

// Attribution: http://www.2ality.com/2012/08/underscore-extend.html
mvelo.util.extend = function(target) {
  var sources = [].slice.call(arguments, 1);
  sources.forEach(function(source) {
    Object.getOwnPropertyNames(source).forEach(function(propName) {
      Object.defineProperty(target, propName,
          Object.getOwnPropertyDescriptor(source, propName));
    });
  });
  return target;
};

mvelo.util.addLoadingAnimation = function($parent) {
  $parent = $parent || $('body')[0];
  var spinner = $('<div class="m-spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
  spinner.appendTo($parent);
};

mvelo.util.showLoadingAnimation = function($parent) {
  $parent = $parent || $('body')[0];
  $('.m-spinner', $parent).show();
};

mvelo.util.hideLoadingAnimation = function($parent) {
  $parent = $parent || $('body')[0];
  $('.m-spinner', $parent).hide();
};

mvelo.util.generateSecurityBackground = function(angle, scaling, coloring) {
  var security = mvelo.util.secBgnd,
    iconWidth = security.width * security.scaling,
    iconHeight = security.height * security.scaling,
    iconAngle = security.angle,
    iconColor = mvelo.SECURE_COLORS[security.colorId];

  if (angle || angle === 0) {
    iconAngle = angle;
  }
  if (scaling) {
    iconWidth = security.width * scaling;
    iconHeight = security.height * scaling;
  }
  if (coloring) {
    iconColor = mvelo.SECURE_COLORS[coloring];
  }

  return '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="' + iconWidth + 'px" height="' + iconHeight + 'px" viewBox="0 0 27 27"><path transform="rotate(' + iconAngle + ' 14 14)" style="fill: ' + iconColor + ';" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>';
};

mvelo.util.showSecurityBackground = function(isEmbedded) {
  if (isEmbedded) {
    $('.secureBgndSettingsBtn').on('mouseenter', function() {
      $('.secureBgndSettingsBtn').removeClass('btn-link').addClass('btn-default');
    });

    $('.secureBgndSettingsBtn').on('mouseleave', function() {
      $('.secureBgndSettingsBtn').removeClass('btn-default').addClass('btn-link');
    });
  }

  mvelo.extension.sendMessage({event: "get-security-background"}, function(background) {
    mvelo.util.secBgnd = background;

    var secBgndIcon = mvelo.util.generateSecurityBackground(),
      secureStyle = '.secureBackground {' +
        'background-color: ' + mvelo.util.secBgnd.color + ';' +
        'background-position: -20px -20px;' +
        'background-image: url(data:image/svg+xml;base64,' + btoa(secBgndIcon) + ');' +
        '}';

    var lockIcon = mvelo.util.generateSecurityBackground(0, null, 2),
      lockButton = '.lockBtnIcon, .lockBtnIcon:active {' +
        'margin: 0px;' +
        'width: 28px; height: 28px;' +
        'background-size: 100% 100%;' +
        'background-repeat: no-repeat;' +
        'background-image: url(data:image/svg+xml;base64,' + btoa(lockIcon) + ');' +
        '}';

    var secBgndStyle = document.getElementById('secBgndCss');
    if (secBgndStyle) {
      secBgndStyle.parentNode.removeChild(secBgndStyle);
    }
    $('head').append($('<style>').attr('id', 'secBgndCss').text(secureStyle + lockButton));
  });
};

mvelo.util.matchPattern2RegEx = function(matchPattern) {
  return new RegExp(
    '^' + matchPattern.replace(/\./g, '\\.')
                      .replace(/\*\\\./, '(\\w+(-\\w+)*\\.)*') + '$'
  );
};

mvelo.util.mapError = function(error) {
  return { message: error.message, code: error.code  || 'INTERNAL_ERROR' };
};

mvelo.util.throwError = function(message, code) {
  var error = new Error(message);
  error.code = code;
  throw error;
};

mvelo.util.PromiseQueue = function() {
  this.queue = [];
};

mvelo.util.PromiseQueue.prototype.push = function(thisArg, method, args) {
  var that = this;
  return new Promise(function(resolve, reject) {
    that.queue.push({resolve: resolve, reject: reject, thisArg: thisArg, method: method, args: args});
    if (that.queue.length === 1) {
      that._next();
    }
  });
};

mvelo.util.PromiseQueue.prototype._next = function() {
  if (this.queue.length === 0) {
    return;
  }
  var that = this;
  var nextEntry = this.queue[0];
  mvelo.util.setTimeout(function() {
    nextEntry.thisArg[nextEntry.method].apply(nextEntry.thisArg, nextEntry.args)
    .then(function(result) {
      nextEntry.resolve(result);
    })
    .catch(function(error) {
      nextEntry.reject(error);
    })
    .then(function() {
      that.queue.shift();
      that._next();
    });
  }, 0);
};

/**
 * Waterfall of async processes
 * @param  {Function} process - has to return Promise, result as array
 * @param  {Array} list - each item is processed
 * @return {Promise} - resolved when all processes finished with end result as array
 */
mvelo.util.sequential = (process, list) => {
  return list.reduce((acc, item) => {
    return acc.then((result) => {
      return process(item).then((processResult) => {
        result.push(...processResult);
        return result;
      })
    });
  }, Promise.resolve([]));
}

/**
 * Validate an email address.
 * @param  {String} address   The email address to validate
 * @return {Boolean}          True if valid, false if not
 */
mvelo.util.checkEmail = function(address) {
  var pattern = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
  return pattern.test(address);
};

/**
 * Inherit from mvelo.EventHandler.prototype to use the new event handling
 * apis 'on' and 'emit'.
 */
mvelo.EventHandler = function() {};

/**
 * Generic port message handler that can be attached via port.onMessage.addListener().
 * Once set up, events can be handled with on('event', function(options) {})
 * @param  {String} options.event   The event descriptor
 * @param  {Object} options         Contains message attributes and data
 */
mvelo.EventHandler.prototype.handlePortMessage = function(options) {
  options = options || {};
  if (this._handlers && this._handlers.has(options.event)) {
    this._handlers.get(options.event).call(this, options);
  } else {
    console.log('Unknown event', options);
  }
};

/**
 * The new event handling style to asign a function to an event.
 * @param  {String} event       The event descriptor
 * @param  {Function} handler   The event handler
 */
mvelo.EventHandler.prototype.on = function(event, handler) {
  if (!event || typeof event !== 'string' || typeof handler !== 'function') {
    throw new Error('Invalid event handler!');
  }
  if (!this._handlers) {
    this._handlers = new Map();
  }
  this._handlers.set(event, handler);
};

/**
 * Helper to emit events via postMessage using a port.
 * @param  {String} event     The event descriptor
 * @param  {Object} options   (optional) Data to be sent in the event
 * @param  {Object} port      (optional) The port to be used. If
 *                            not specified, the main port is used.
 */
mvelo.EventHandler.prototype.emit = function(event, options, port) {
  if (!event || typeof event !== 'string') {
    throw new Error('Invalid event!');
  }
  options = options || {};
  options.event = event;
  options.sender = options.sender || this._senderId;
  (port || this._port || this.ports[this.mainType]).postMessage(options);
};

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = mvelo;
}
