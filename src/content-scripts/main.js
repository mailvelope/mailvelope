/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

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

let intervalID = 0;
//let contextTarget = null;
let port = null;
let watchList = null;
let clientApiActive = false;

export let host = null;
export let currentProvider = null;
export let prefs = null;

document.body.dataset.mailvelopeVersion = '@@mvelo_version';

function connect() {
  if (document.mveloControl) {
    return;
  }
  port = mvelo.EventHandler.connect(`mainCS-${mvelo.util.getHash()}`);
  registerEventListener();
  port.emit('ready');
  //initContextMenu();
  document.mveloControl = true;
}

$(document).ready(connect);

function init(preferences, watchlist) {
  prefs = preferences;
  watchList = watchlist;
  detectHost();
  if (clientApiActive) {
    // api case
    clientAPI.init();
  } else {
    // non-api case ... use provider specific content scripts
    providers.init();
    currentProvider = providers.get(host);
    // turn on scan loop
    on();
  }
}

function registerEventListener() {
  port.on('destroy', onDestroy);
  port.on('init', ({prefs, watchList}) => init(prefs, watchList));
  port.on('set-prefs', msg => prefs = msg.prefs);
  port.onDisconnect.addListener(off);
}

function onDestroy() {
  off();
  port.disconnect();
}

function detectHost() {
  for (const site of watchList) {
    if (!site.active || !site.frames) {
      continue;
    }
    for (const frame of site.frames) {
      if (!frame.scan) {
        continue;
      }
      const hostRegex = mvelo.util.matchPattern2RegEx(frame.frame);
      const validHost = hostRegex.test(window.location.hostname);
      if (validHost) {
        // host = match pattern without *. prefix
        host = frame.frame.replace(/^\*\./, '');
        if (frame.api) {
          clientApiActive = true;
          return;
        }
      }
    }
  }
}

function on() {
  if (clientApiActive) {
    return; // do not use scan loop in case of clientAPI support
  }

  //console.log('inside cs: ', document.location.host);
  if (intervalID === 0) {
    // start scan loop
    scanLoop();
    intervalID = window.setInterval(() => {
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
  const pgpTag = findPGPTag(PGP_FOOTER);
  if (pgpTag.length !== 0) {
    attachExtractFrame(pgpTag);
  }
  // find editable content
  const editable = findEditable();
  if (editable.length !== 0) {
    attachEncryptFrame(editable);
  }
}

/**
 * find text nodes in DOM that match certain pattern
 * @return $([nodes])
 */
function findPGPTag() {
  const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentNode.tagName !== 'SCRIPT' && PGP_FOOTER.test(node.textContent)) {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_REJECT;
      }
    }
  }, false);

  let nodeList = [];

  while (treeWalker.nextNode()) {
    nodeList.push(treeWalker.currentNode);
  }

  // filter out hidden elements
  nodeList = $(nodeList).filter(function() {
    const element = $(this);
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
  let editable = $('[contenteditable], textarea').filter(':visible').not('body');
  const iframes = $('iframe').filter(':visible');
  // find dynamically created iframes where src is not set
  const dynFrames = iframes.filter(function() {
    const src = $(this).attr('src');
    return src === undefined ||
           src === '' ||
           /^javascript.*/.test(src) ||
           /^about.*/.test(src);
  });
  // find editable elements inside dynamic iframe (content script is not injected here)
  dynFrames.each(function() {
    const content = $(this).contents();
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
      const editblElem = content.find('[contenteditable], textarea').filter(':visible');
      editable = editable.add(editblElem);
    }
  });
  // find iframes from same origin with a contenteditable body (content script is injected, but encrypt frame needs to be attached to outer iframe)
  const anchor = $('<a/>');
  const editableBody = iframes.not(dynFrames).filter(function() {
    const frame = $(this);
    // only for iframes from same host
    if (anchor.attr('href', frame.attr('src')).prop('hostname') === document.location.hostname) {
      try {
        const content = frame.contents();
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
  const newObj = element.filter(function() {
    return !isAttached($(this).parent());
  });
  // create new decrypt frames for new discovered PGP tags
  newObj.each((index, element) => {
    try {
      // parent element of text node
      const pgpEnd = $(element).parent();
      switch (getMessageType(pgpEnd.text())) {
        case mvelo.PGP_MESSAGE: {
          const dFrame = new DecryptFrame();
          dFrame.attachTo(pgpEnd);
          break;
        }
        case mvelo.PGP_SIGNATURE: {
          const vFrame = new VerifyFrame();
          vFrame.attachTo(pgpEnd);
          break;
        }
        case mvelo.PGP_PUBLIC_KEY: {
          const imFrame = new ImportFrame();
          imFrame.attachTo(pgpEnd);
          break;
        }
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
  const newObj = element.filter(function() {
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
  newObj.each((index, element) => {
    const eFrame = new EncryptFrame();
    eFrame.attachTo($(element), {expanded});
  });
}

function isAttached(element) {
  const status = element.data(mvelo.FRAME_STATUS);
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
