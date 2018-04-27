
/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2017 Mailvelope GmbH
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

var mvelo = {}; // eslint-disable-line no-var
// web extension
mvelo.webex = typeof browser !== 'undefined';
// chrome extension
mvelo.crx = !mvelo.webex && typeof chrome !== 'undefined';

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
mvelo.LOCAL_KEYRING_ID = `localhost${mvelo.KEYRING_DELIMITER}mailvelope`;
mvelo.GNUPG_KEYRING_ID = `localhost${mvelo.KEYRING_DELIMITER}gnupg`;
// colors for secure background
mvelo.SECURE_COLORS = ['#e9e9e9', '#c0c0c0', '#808080', '#ffce1e', '#ff0000', '#85154a', '#6f2b8b', '#b3d1e3', '#315bab', '#1c449b', '#4c759c', '#1e8e9f', '#93b536'];
// 50 MB file size limit
mvelo.MAX_FILE_UPLOAD_SIZE = 50 * 1024 * 1024;
// stable id if app runs in top frame
mvelo.APP_TOP_FRAME_ID = 'apptopframeid';

mvelo.Error = class extends Error {
  constructor(msg, code = 'INTERNAL_ERROR') {
    super(msg);
    this.code = code;
  }
};

mvelo.appendTpl = function($element, path) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', path);
    req.responseType = 'text';
    req.onload = function() {
      if (req.status == 200) {
        $element.append($.parseHTML(req.response));
        setTimeout(() => resolve($element), 1);
      } else {
        reject(new Error(req.statusText));
      }
    };
    req.onerror = function() {
      reject(new Error('Network Error'));
    };
    req.send();
  });
};

mvelo.runtime = chrome.runtime;

mvelo.l10n = {};

mvelo.l10n.getMessage = chrome.i18n.getMessage;

mvelo.l10n.getMessages = function(ids) {
  const result = {};
  ids.forEach(id => result[id] = chrome.i18n.getMessage(id));
  return result;
};

mvelo.l10n.localizeHTML = function(l10n, idSelector) {
  const selector = idSelector ? `${idSelector} [data-l10n-id]` : '[data-l10n-id]';
  $(selector).each(function() {
    const jqElement = $(this);
    const id = jqElement.data('l10n-id');
    const text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
    jqElement.text(text);
  });
  $('[data-l10n-title-id]').each(function() {
    const jqElement = $(this);
    const id = jqElement.data('l10n-title-id');
    const text = l10n ? l10n[id] : chrome.i18n.getMessage(id) || id;
    jqElement.attr('title', text);
  });
};

mvelo.ui = {};

mvelo.ui.terminate = function(port) {
  mvelo.util.removeSecurityBackground()
  .then(() => {
    $('body').empty();
    setTimeout(() => {
      $('body').removeClass()
      .addClass('glyphicon glyphicon-flash termination');
    }, 0);
  });
  port.disconnect();
};

mvelo.ui.addDocumentTitle = function(text) {
  const title = document.createElement('title');
  title.appendChild(document.createTextNode(text));
  document.head.appendChild(title);
};

mvelo.util = {};

mvelo.util.sortAndDeDup = function(unordered, compFn) {
  const result = [];
  const sorted = unordered.sort(compFn);
  // remove duplicates
  for (let i = 0; i < sorted.length; i++) {
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
  const result = [];
  (list || []).forEach(i => {
    if (result.indexOf(i) === -1) {
      result.push(i);
    }
  });
  return result;
};

// random hash generator
mvelo.util.getHash = function() {
  let result = '';
  const buf = new Uint16Array(6);
  window.crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
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

/**
 * Normalize PGP armored message
 * @param  {String} msg
 * @param  {Regex} typeRegex - filter message with this Regex
 * @return {String}
 */
mvelo.util.normalizeArmored = function(msg, typeRegex) {
  // filtering to get well defined PGP message format
  msg = msg.replace(/\r\n/g, '\n'); // unify new line characters
  msg = msg.replace(/\n\s+/g, '\n'); // compress sequence of whitespace and new line characters to one new line
  msg = msg.replace(/[^\S\r\n]/g, ' '); // unify white space characters (all \s without \r and \n)
  if (typeRegex) {
    msg = msg.match(typeRegex);
    if (msg) {
      msg = msg[0];
    } else {
      throw new mvelo.Error('Could not extract valid PGP message', 'INVALID_ARMORED_BLOCK');
    }
  }
  msg = msg.replace(/^(\s?>)+/gm, ''); // remove quotation
  msg = msg.replace(/^\s+/gm, ''); // remove leading whitespace
  msg = msg.replace(/:.*\n(?!.*:)/, '$&\n');  // insert new line after last armor header
  msg = msg.replace(/-----\n(?!.*:)/, '$&\n'); // insert new line if no header
  msg = mvelo.util.decodeQuotedPrint(msg);
  return msg;
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
  const ab = new Uint8Array(buf);
  return mvelo.util.Uint8Array2str(ab);
};

mvelo.util.Uint8Array2str = function(ab) {
  let str = '';
  const CHUNK_SIZE = Math.pow(2, 16);
  let offset;
  let len;
  let subab;
  for (offset = 0; offset < ab.length; offset += CHUNK_SIZE) {
    len = Math.min(CHUNK_SIZE, ab.length - offset);
    subab = ab.subarray(offset, offset + len);
    str += String.fromCharCode.apply(null, subab);
  }
  return str;
};

mvelo.util.str2ab = function(str) {
  const bufView = mvelo.util.str2Uint8Array(str);
  return bufView.buffer;
};

mvelo.util.str2Uint8Array = function(str) {
  const bufView = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
};

mvelo.util.addLoadingAnimation = function($parent) {
  $parent = $parent || $('body')[0];
  const spinner = $('<div class="m-spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>');
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

mvelo.util.generateSecurityBackground = function({width, height, scaling = 1, angle = 0, colorId = 0}) {
  const iconWidth = width * scaling;
  const iconHeight = height * scaling;
  const iconColor = mvelo.SECURE_COLORS[colorId];

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg" id="secBgnd" version="1.1" width="${iconWidth}px" height="${iconHeight}px" viewBox="0 0 27 27"><path transform="rotate(${angle} 14 14)" style="fill: ${iconColor};" d="m 13.963649,25.901754 c -4.6900005,0 -8.5000005,-3.78 -8.5000005,-8.44 0,-1.64 0.47,-3.17 1.29,-4.47 V 9.0417546 c 0,-3.9399992 3.23,-7.1499992 7.2000005,-7.1499992 3.97,0 7.2,3.21 7.2,7.1499992 v 3.9499994 c 0.82,1.3 1.3,2.83 1.3,4.48 0,4.65 -3.8,8.43 -8.49,8.43 z m -1.35,-7.99 v 3.33 h 0 c 0,0.02 0,0.03 0,0.05 0,0.74 0.61,1.34 1.35,1.34 0.75,0 1.35,-0.6 1.35,-1.34 0,-0.02 0,-0.03 0,-0.05 h 0 v -3.33 c 0.63,-0.43 1.04,-1.15 1.04,-1.97 0,-1.32 -1.07,-2.38 -2.4,-2.38 -1.32,0 -2.4,1.07 -2.4,2.38 0.01,0.82 0.43,1.54 1.06,1.97 z m 6.29,-8.8699994 c 0,-2.7099992 -2.22,-4.9099992 -4.95,-4.9099992 -2.73,0 -4.9500005,2.2 -4.9500005,4.9099992 V 10.611754 C 10.393649,9.6217544 12.103649,9.0317546 13.953649,9.0317546 c 1.85,0 3.55,0.5899998 4.94,1.5799994 l 0.01,-1.5699994 z" /></svg>`;
};

mvelo.util.showSecurityBackground = function(port, isEmbedded) {
  if (isEmbedded) {
    $('.secureBgndSettingsBtn').on('mouseenter', () => {
      $('.secureBgndSettingsBtn').removeClass('btn-link').addClass('btn-default');
    });

    $('.secureBgndSettingsBtn').on('mouseleave', () => {
      $('.secureBgndSettingsBtn').removeClass('btn-default').addClass('btn-link');
    });
  }

  port.send('get-security-background')
  .then(background => {
    const secBgndIcon = mvelo.util.generateSecurityBackground(background);
    const secureStyle = `\n.secureBackground {
      background-color: ${background.color};
      background-position: -20px -20px;
      background-image: url(data:image/svg+xml;base64,${btoa(secBgndIcon)});
    }`;

    const lockIcon = mvelo.util.generateSecurityBackground({width: 28, height: 28, colorId: 2});
    const lockButton = `\n.lockBtnIcon, .lockBtnIcon:active {
      margin: 0;
      width: 28px; height: 28px;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-image: url(data:image/svg+xml;base64,'}${btoa(lockIcon)});
    }`;

    mvelo.util.removeSecurityBackground();
    $('head').append($('<style>').attr('id', 'secBgndCss').text(secureStyle + lockButton));
  });
};

mvelo.util.removeSecurityBackground = function() {
  return new Promise(resolve => {
    const secBgndStyle = document.getElementById('secBgndCss');
    if (secBgndStyle) {
      secBgndStyle.parentNode.removeChild(secBgndStyle);
    }
    setTimeout(resolve, 0);
  });
};

mvelo.util.matchPattern2RegEx = function(matchPattern) {
  return new RegExp(
    `^${mvelo.util.matchPattern2RegExString(matchPattern)}$`
  );
};

mvelo.util.matchPattern2RegExString = function(matchPattern) {
  return matchPattern.replace(/\./g, '\\.').replace(/\*\\\./, '(\\w+(-\\w+)*\\.)*');
};

mvelo.util.mapError = function(error) {
  return {message: error.message, code: error.code  || 'INTERNAL_ERROR'};
};

mvelo.util.PromiseQueue = class {
  constructor() {
    this.queue = [];
  }

  push(thisArg, method, args) {
    return new Promise((resolve, reject) => {
      this.queue.push({resolve, reject, thisArg, method, args});
      if (this.queue.length === 1) {
        this._next();
      }
    });
  }

  _next() {
    if (this.queue.length === 0) {
      return;
    }
    const nextEntry = this.queue[0];
    setTimeout(() => {
      nextEntry.thisArg[nextEntry.method].apply(nextEntry.thisArg, nextEntry.args)
      .then(result => {
        nextEntry.resolve(result);
      })
      .catch(error => {
        nextEntry.reject(error);
      })
      .then(() => {
        this.queue.shift();
        this._next();
      });
    }, 0);
  }
};

/**
 * Waterfall of async processes
 * @param  {Function} process - has to return Promise, result as array
 * @param  {Array} list - each item is processed
 * @return {Promise} - resolved when all processes finished with end result as array
 */
/* eslint-disable arrow-body-style */
mvelo.util.sequential = (process, list) => {
  return list.reduce((acc, item) => {
    return acc.then(result => {
      return process(item).then(processResult => {
        result.push(...processResult);
        return result;
      });
    });
  }, Promise.resolve([]));
};
/* eslint-enable arrow-body-style */

/**
 * Validate an email address.
 * @param  {String} address   The email address to validate
 * @return {Boolean}          True if valid, false if not
 */
mvelo.util.checkEmail = function(address) {
  const pattern = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
  return pattern.test(address);
};

/**
 * Inherit from mvelo.EventHandler.prototype to use the new event handling
 * apis 'on' and 'emit'.
 * @param {Port} port - port object received from runtime.connect()
 * @param {Map} handlers - handler map of parent event handler
 */
mvelo.EventHandler = class {
  constructor(port, handlers) {
    if (port) {
      this.initPort(port);
    }
    this._handlers = handlers || new Map();
    this._reply = null;
    this._replyCount = 0;
    this._handlerObject = null;
  }

  /**
   * Open port to background script
   * @param  {String} sender identifier of sender (type + id)
   * @return {EventHandler}        initialized EventHandler
   */
  static connect(sender, handlerObject) {
    const eventHandler = new mvelo.EventHandler(mvelo.runtime.connect({name: sender}));
    eventHandler._handlerObject = handlerObject;
    return eventHandler;
  }

  initPort(port) {
    this._port = port;
    this._port.onMessage.addListener(this.handlePortMessage.bind(this));
  }

  /**
   * Disconnect port
   */
  disconnect() {
    if (this._port) {
      this._port.disconnect();
    }
  }

  /**
   * Generic port message handler that can be attached via port.onMessage.addListener().
   * Once set up, events can be handled with on('event', function(options) {})
   * @param  {String} options.event   The event descriptor
   * @param  {Object} options         Contains message attributes and data
   */
  handlePortMessage(options = {}) {
    if (this._handlers.has(options.event)) {
      const handler = this._handlers.get(options.event);
      if (options._reply) {
        // sender expects reply
        Promise.resolve()
        .then(() => handler.call(this, options))
        .then(result => this.emit('_reply', {result: result || null, _reply: options._reply}))
        .catch(error => this.emit('_reply', {error: mvelo.util.mapError(error), _reply: options._reply}));
      } else {
        // normal one way communication
        handler.call(this, options);
      }
    } else if (options.event === '_reply') {
      // we have received a reply
      const replyHandler = this._reply.get(options._reply);
      this._reply.delete(options._reply);
      if (options.error) {
        replyHandler.reject(options.error);
      } else {
        replyHandler.resolve(options.result);
      }
    } else {
      console.log('Unknown event', options);
    }
  }

  /**
   * The new event handling style to asign a function to an event.
   * @param  {String} event       The event descriptor
   * @param  {Function} handler   The event handler
   */
  on(event, handler) {
    if (!event || typeof event !== 'string' || event === '_reply' || typeof handler !== 'function') {
      throw new Error('Invalid event handler!');
    }
    this._handlers.set(event, handler.bind(this._handlerObject || this));
  }

  /**
   * Helper to emit events via postMessage using a port.
   * @param  {String} event     The event descriptor
   * @param  {Object} options   (optional) Data to be sent in the event
   */
  emit(event, options = {}) {
    if (!event || typeof event !== 'string') {
      throw new Error('Invalid event!');
    }
    options.event = event;
    this._port.postMessage(options);
  }

  /**
   * Like emit but receiver can send response
   * @param  {String} event     The event descriptor
   * @param  {Object} options   (optional) Data to be sent in the event
   * @param  {Object} port      (optional) The port to be used. If
   *                            not specified, the main port is used.
   * @return {Promise}
   */
  send(event, options = {}) {
    return new Promise((resolve, reject) => {
      if (!event || typeof event !== 'string') {
        return reject(new Error('Invalid event!'));
      }
      if (!this._reply) {
        this._reply = new Map();
      }
      options.event = event;
      options._reply = ++this._replyCount;
      this._reply.set(options._reply, {resolve, reject});
      this._port.postMessage(options);
    });
  }
};

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = mvelo;
}
