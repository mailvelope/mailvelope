/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';

import * as clientAPI from './clientAPI';
import * as providers from './providerSpecific';
import DecryptFrame from './decryptFrame';
import VerifyFrame from './verifyFrame';
import ImportFrame from './importFrame';
import EncryptFrame from './encryptFrame';

const SCAN_LOOP_INTERVAL = 2500; // ms
const PGP_FOOTER = /END\sPGP/;
const MIN_EDIT_HEIGHT = 84;
const NAME = 'mainCS-' + mvelo.util.getHash();

let intervalID = 0;
//let contextTarget = null;
let port = null;
let watchList = null;

export let host = null;
export let currentProvider = null;
export let prefs = null;

function connect() {
  if (document.mveloControl) {
    return;
  }
  port = mvelo.extension.connect({name: NAME});
  addMessageListener();
  port.postMessage({event: 'get-prefs', sender: NAME});
  //initContextMenu();
  document.mveloControl = true;
}

$(document).ready(connect);

function init(preferences, watchlist) {
  prefs = preferences;
  watchList = watchlist;
  detectHost();

  if (clientAPI.active) {
    // api case
    clientAPI.init();
    return;
  }

  // non-api case ... use provider specific content scripts
  providers.init();
  currentProvider = providers.get(host);
  if (prefs.main_active) {
    on();
  } else {
    off();
  }
}

function detectHost() {
  clientAPI.active = watchList.some(function(site) {
    return site.active && site.frames && site.frames.some(function(frame) {
      var hostRegex = mvelo.util.matchPattern2RegEx(frame.frame);
      var validHost = hostRegex.test(window.location.hostname);
      if (frame.scan && validHost) {
        // host = match pattern without *. prefix
        host = frame.frame.replace(/^\*\./, '');
        if (frame.api) {
          return true;
        }
      }
    });
  });
}

function on() {
  if (clientAPI.active) {
    return; // do not use scan loop in case of clientAPI support
  }

  //console.log('inside cs: ', document.location.host);
  if (intervalID === 0) {
    // start scan loop
    scanLoop();
    intervalID = window.setInterval(function() {
      scanLoop();
    }, SCAN_LOOP_INTERVAL);
  }
}

function off() {
  if (intervalID !== 0) {
    window.clearInterval(intervalID);
    intervalID = 0;
  }
}

function scanLoop() {
  // find armored PGP text
  var pgpTag = findPGPTag(PGP_FOOTER);
  if (pgpTag.length !== 0) {
    attachExtractFrame(pgpTag);
  }
  // find editable content
  var editable = findEditable();
  if (editable.length !== 0) {
    attachEncryptFrame(editable);
  }
}

/**
 * find text nodes in DOM that match certain pattern
 * @return $([nodes])
 */
function findPGPTag() {
  var treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      if (node.parentNode.tagName !== 'SCRIPT' && PGP_FOOTER.test(node.textContent)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_REJECT;
      }
    }
  }, false);

  var nodeList = [];

  while (treeWalker.nextNode()) {
    nodeList.push(treeWalker.currentNode);
  }

  // filter out hidden elements
  nodeList = $(nodeList).filter(function() {
    var element = $(this);
    // visibility check does not work on text nodes
    return element.parent().is(':visible') &&
      // no elements within editable elements
      element.parents('[contenteditable], textarea').length === 0 &&
      this.ownerDocument.designMode !== 'on';
  });

  return nodeList;
}

function findEditable() {
  // find textareas and elements with contenteditable attribute, filter out <body>
  var editable = $('[contenteditable], textarea').filter(':visible').not('body');
  var iframes = $('iframe').filter(':visible');
  // find dynamically created iframes where src is not set
  var dynFrames = iframes.filter(function() {
    var src = $(this).attr('src');
    return src === undefined ||
           src === '' ||
           /^javascript.*/.test(src) ||
           /^about.*/.test(src);
  });
  // find editable elements inside dynamic iframe (content script is not injected here)
  dynFrames.each(function() {
    var content = $(this).contents();
    // set event handler for contextmenu
    content.find('body')//.off("contextmenu").on("contextmenu", onContextMenu)
    // mark body as 'inside iframe'
                        .data(mvelo.DYN_IFRAME, true)
    // add iframe element
                        .data(mvelo.IFRAME_OBJ, $(this));
    // document of iframe in design mode or contenteditable set on the body
    if (content.attr('designMode') === 'on' || content.find('body[contenteditable]').length !== 0) {
      // add iframe to editable elements
      editable = editable.add($(this));
    } else {
      // editable elements inside iframe
      var editblElem = content.find('[contenteditable], textarea').filter(':visible');
      editable = editable.add(editblElem);
    }
  });
  // find iframes from same origin with a contenteditable body (content script is injected, but encrypt frame needs to be attached to outer iframe)
  var anchor = $('<a/>');
  var editableBody = iframes.not(dynFrames).filter(function() {
    var frame = $(this);
    // only for iframes from same host
    if (anchor.attr('href', frame.attr('src')).prop('hostname') === document.location.hostname) {
      try {
        var content = frame.contents();
        if (content.attr('designMode') === 'on' || content.find('body[contenteditable]').length !== 0) {
          // set event handler for contextmenu
          //content.find('body').off("contextmenu").on("contextmenu", onContextMenu);
          // mark body as 'inside iframe'
          content.find('body').data(mvelo.IFRAME_OBJ, frame);
          return true;
        } else {
          return false;
        }
      } catch (e) {
        return false;
      }
    }
  });
  editable = editable.add(editableBody);
  // filter out elements below a certain height limit
  editable = editable.filter(function() {
    return $(this).height() > MIN_EDIT_HEIGHT;
  });
  return editable;
}

export function getMessageType(armored) {
  if (/END\sPGP\sMESSAGE/.test(armored)) {
    return mvelo.PGP_MESSAGE;
  } else if (/END\sPGP\sSIGNATURE/.test(armored)) {
    return mvelo.PGP_SIGNATURE;
  } else if (/END\sPGP\sPUBLIC\sKEY\sBLOCK/.test(armored)) {
    return mvelo.PGP_PUBLIC_KEY;
  } else if (/END\sPGP\sPRIVATE\sKEY\sBLOCK/.test(armored)) {
    return mvelo.PGP_PRIVATE_KEY;
  }
}

function attachExtractFrame(element) {
  // check status of PGP tags
  var newObj = element.filter(function() {
    return !isAttached($(this).parent());
  });
  // create new decrypt frames for new discovered PGP tags
  newObj.each(function(index, element) {
    try {
      // parent element of text node
      var pgpEnd = $(element).parent();
      switch (getMessageType(pgpEnd.text())) {
        case mvelo.PGP_MESSAGE:
          var dFrame = new DecryptFrame(prefs);
          dFrame.attachTo(pgpEnd);
          break;
        case mvelo.PGP_SIGNATURE:
          var vFrame = new VerifyFrame(prefs);
          vFrame.attachTo(pgpEnd);
          break;
        case mvelo.PGP_PUBLIC_KEY:
          var imFrame = new ImportFrame(prefs);
          imFrame.attachTo(pgpEnd);
          break;
      }
    } catch (e) {}
  });
}

/**
 * attach encrypt frame to element
 * @param  {$} element
 * @param  {boolean} expanded state of frame
 */
function attachEncryptFrame(element, expanded) {
  // check status of elements
  var newObj = element.filter(function() {
    if (expanded) {
      // filter out only attached frames
      if (element.data(mvelo.FRAME_STATUS) === mvelo.FRAME_ATTACHED) {
        // trigger expand state of attached frames
        element.data(mvelo.FRAME_OBJ).showEncryptDialog();
        return false;
      } else {
        return true;
      }
    } else {
      // filter out attached and detached frames
      return !isAttached($(this));
    }
  });
  // create new encrypt frames for new discovered editable fields
  newObj.each(function(index, element) {
    var eFrame = new EncryptFrame(prefs);
    eFrame.attachTo($(element), {expanded: expanded});
  });
}

function addMessageListener() {
  port.onMessage.addListener(
    function(request) {
      //console.log('contentscript: %s onRequest: %o', document.location.toString(), request);
      if (request.event === undefined) {
        return;
      }
      switch (request.event) {
        case 'on':
          on();
          break;
        case 'off':
          off();
          break;
        case 'destroy':
          off();
          port.disconnect();
          break;
        /*
        case 'context-encrypt':
          if (contextTarget !== null) {
            attachEncryptFrame(contextTarget, true);
            contextTarget = null;
          }
          break;
        */
        case 'set-prefs':
          init(request.prefs, request.watchList);
          break;
        default:
          console.log('unknown event');
      }
    }
  );
  port.onDisconnect.addListener(function() {
    off();
  });
}

function isAttached(element) {
  var status = element.data(mvelo.FRAME_STATUS);
  switch (status) {
    case mvelo.FRAME_ATTACHED:
    case mvelo.FRAME_DETACHED:
      return true;
    default:
      return false;
  }
}

/*
function initContextMenu() {
  // set handler
  $("body").on("contextmenu", onContextMenu);
}

function onContextMenu(e) {
  //console.log(e.target);
  var target = $(e.target);
  // find editable descendants or ascendants
  var element = target.find('[contenteditable], textarea');
  if (element.length === 0) {
    element = target.closest('[contenteditable], textarea');
  }
  if (element.length !== 0 && !element.is('body')) {
    if (element.height() > MIN_EDIT_HEIGHT) {
      contextTarget = element;
    } else {
      contextTarget = null;
    }
    return;
  }
  // inside dynamic iframe or iframes from same origin with a contenteditable body
  element = target.closest('body');
  // get outer iframe
  var iframeObj = element.data(mvelo.IFRAME_OBJ);
  if (iframeObj !== undefined) {
    // target set to outer iframe
    contextTarget = iframeObj;
    return;
  }
  // no suitable element found
  contextTarget = null;
}
*/

//# sourceURL=cs-mailvelope.js
