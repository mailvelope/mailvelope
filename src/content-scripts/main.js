/**
 * Copyright (C) 2012-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, PGP_MESSAGE, PGP_SIGNATURE, PGP_PUBLIC_KEY, PGP_PRIVATE_KEY} from '../lib/constants';
import {getUUID, matchPattern2RegEx, isVisible, firstParent} from '../lib/util';
import EventHandler from '../lib/EventHandler';

import * as clientAPI from './clientAPI';
import * as providers from './providerSpecific';
import DecryptFrame from './decryptFrame';
import VerifyFrame from './verifyFrame';
import ImportFrame from './importFrame';
import EncryptFrame from './encryptFrame';

const PGP_HEADER = /-----BEGIN\sPGP\s(SIGNED|MESSAGE|PUBLIC)/;
const PGP_FOOTER = /END\sPGP\s(MESSAGE|SIGNATURE|PUBLIC KEY BLOCK)-----/;
const MIN_EDIT_HEIGHT = 84;
const OBSERVER_TIMEOUT = 300; // ms

let domObserver = null;
let clickHandler = null;
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
  port = EventHandler.connect(`mainCS-${getUUID()}`);
  registerEventListener();
  port.emit('ready');
  //initContextMenu();
  document.mveloControl = true;
}

if (document.readyState !== 'loading') {
  connect();
} else {
  document.addEventListener('DOMContentLoaded', connect);
}

function init(preferences, watchlist) {
  prefs = preferences;
  watchList = watchlist;
  detectHost();
  if (clientApiActive) {
    // api case
    clientAPI.init();
  } else {
    // non-api case ... use provider specific content scripts
    providers.init(prefs);
    currentProvider = providers.get(host);
    // turn on DOM scan
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
  if (currentProvider.integration) {
    currentProvider.integration.deactivate();
  }
  // re-init provider specific content scripts
  init(prefs, watchList);
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
      const hostRegex = matchPattern2RegEx(frame.frame);
      let hostID = window.location.hostname;
      const port = window.location.port;
      if (port && frame.frame.includes(':')) {
        hostID = `${hostID}:${port}`;
      }
      const validHost = hostRegex.test(hostID);
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
    return; // do not use DOM scan in case of clientAPI support
  }
  const mutateEvent = new CustomEvent('mailvelope-observe');
  // let hasMutated = false;
  let timeout = null;
  const next = () => {
    scanDOM();
    document.dispatchEvent(mutateEvent);
  };
  domObserver = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(next, OBSERVER_TIMEOUT);
  });
  clickHandler = () => {
    clearTimeout(timeout);
    timeout = setTimeout(next, OBSERVER_TIMEOUT);
  };
  document.addEventListener('click', clickHandler, {capture: true});
  domObserver.observe(document.body, {subtree: true, childList: true});
  // start DOM scan
  scanDOM();
  if (currentProvider.integration) {
    currentProvider.integration.updateElements();
  }
}

function off() {
  if (domObserver) {
    domObserver.disconnect();
  }
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true);
  }
}

function scanDOM() {
  // find armored PGP text
  try {
    const pgpRanges = findPGPRanges();
    if (pgpRanges.length) {
      attachExtractFrame(pgpRanges);
    }
  } catch (e) {
    console.log('Detecting PGP messages failed: ', e);
  }
  if (currentProvider.integration) {
    return;
  }
  try {
    const editables = findEditable();
    if (editables.length !== 0) {
      attachEncryptFrame(editables);
    }
  } catch (e) {
    console.log('Detecting editor elements failed: ', e);
  }
}

/**
 * Check the nodes text content for PGP_HEADER and PGP_FOOTER
 * @return NodeFilter.FILTER_ACCEPT|NodeFilter.FILTER_REJECT
 */
function acceptNode(node) {
  if (PGP_HEADER.test(node.textContent) || PGP_FOOTER.test(node.textContent)) {
    return NodeFilter.FILTER_ACCEPT;
  }
  return NodeFilter.FILTER_REJECT;
}

/**
 * Find text nodes in DOM that contain PGP messages
 * @return {Array.<Range>} - Array of Range objects containing the found PGP messages
 */
function findPGPRanges() {
  const walkers = [];
  walkers.push(document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode}, false));
  // check iframes for PGP content
  let iframes = Array.from(document.getElementsByTagName('iframe')).filter(frame => frame.contentDocument && frame.contentDocument.body && frame.contentDocument.body.innerHTML);
  // only dynamically created iframes
  iframes = iframes.filter(frame => !frame.getAttribute('src') || /^(about|javascript).*/.test(frame.src));
  for (const frame of iframes) {
    walkers.push(document.createTreeWalker(frame.contentDocument.body, NodeFilter.SHOW_TEXT, {acceptNode}, false));
  }
  const rangeList = [];
  for (const treeWalker of walkers) {
    let currPGPBegin = null;
    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      // check if element is editable
      const isEditable = firstParent(node, '[contenteditable], textarea');
      if (isEditable ||
        treeWalker.currentNode.parentNode.tagName.toLowerCase() === 'script' ||
        treeWalker.currentNode.ownerDocument.designMode === 'on') {
        continue;
      }
      const isPGPBegin = PGP_HEADER.exec(treeWalker.currentNode.textContent);
      if (isPGPBegin) {
        currPGPBegin = treeWalker.currentNode;
        const isPGPEnd = PGP_FOOTER.exec(treeWalker.currentNode.textContent);
        if (!isPGPEnd || isPGPBegin.index > isPGPEnd.index) {
          continue;
        }
      }
      if (currPGPBegin && getMessageType(currPGPBegin.textContent) === getMessageType(treeWalker.currentNode.textContent)) {
        const pgpEnd = treeWalker.currentNode;
        const range = pgpEnd.ownerDocument.createRange();
        range.setStartBefore(currPGPBegin);
        range.setEndAfter(pgpEnd);
        const commonParentContainer = range.commonAncestorContainer;
        let depth = 0;
        let currParent = pgpEnd.parentElement;
        while (currParent.parentElement && depth < 3) {
          if (currParent === commonParentContainer) {
            rangeList.push(range);
            break;
          }
          currParent = currParent.parentElement;
          depth ++;
        }
      }
    }
  }
  return rangeList;
}

function findEditable() {
  // find textareas and elements with contenteditable attribute, filter out <body>
  let editable = Array.from(document.querySelectorAll('[contenteditable="true"], textarea')).filter(isVisible).filter(element => element.tagName.toLowerCase() !== 'body');
  const iframes = Array.from(document.getElementsByTagName('iframe')).filter(isVisible);
  const dynFrames = [];
  const origFrames = [];
  for (const frame of iframes) {
    // find dynamically created iframes where src is not set
    if (!frame.src || /^javascript.*/.test(frame.src) || /^about.*/.test(frame.src)) {
      dynFrames.push(frame);
    } else {
      origFrames.push(frame);
    }
  }
  // find editable elements inside dynamic iframe (content script is not injected here)
  for (const dynFrame of dynFrames) {
    const content = dynFrame.contentDocument;
    // document of iframe in design mode or contenteditable set on the body
    if (content.designMode === 'on' || content.querySelector('body[contenteditable="true"]')) {
      // add iframe to editable elements
      editable.push(dynFrame);
    } else {
      // editable elements inside iframe
      const editblElem = Array.from(content.querySelectorAll('[contenteditable="true"], textarea')).filter(isVisible);
      editable.push(...editblElem);
    }
  }
  // find iframes from same origin with a contenteditable body (content script is injected, but encrypt frame needs to be attached to outer iframe)
  const anchor = document.createElement('a');
  for (const origFrame of origFrames) {
    anchor.href = origFrame.href;
    if (anchor.hostname !== document.location.hostname) {
      continue;
    }
    try {
      const content = origFrame.contentDocument;
      if (content.designMode === 'on' || content.querySelector('body[contenteditable="true"]')) {
        editable.push(origFrame);
      }
    } catch (e) {}
  }
  // filter out elements below a certain height limit
  editable = editable.filter(element => element.getBoundingClientRect().height > MIN_EDIT_HEIGHT);
  return editable;
}

export function getMessageType(armored) {
  if (/(BEGIN|END)\sPGP\sMESSAGE/.test(armored)) {
    return PGP_MESSAGE;
  } else if (/BEGIN\sPGP\sSIGNED\sMESSAGE/.test(armored)) {
    return PGP_SIGNATURE;
  } else if (/END\sPGP\sSIGNATURE/.test(armored)) {
    return PGP_SIGNATURE;
  } else if (/(BEGIN|END)\sPGP\sPUBLIC\sKEY\sBLOCK/.test(armored)) {
    return PGP_PUBLIC_KEY;
  } else if (/(BEGIN|END)\sPGP\sPRIVATE\sKEY\sBLOCK/.test(armored)) {
    return PGP_PRIVATE_KEY;
  }
}

function attachExtractFrame(ranges) {
  // check status of PGP ranges
  const newRanges = ranges.filter(range =>
    !isAttached(range.commonAncestorContainer)
  );
  // create new decrypt frames for new discovered PGP tags
  for (const range of newRanges) {
    try {
      switch (getMessageType(range.endContainer.textContent)) {
        case PGP_MESSAGE: {
          const dFrame = new DecryptFrame();
          dFrame.attachTo(range);
          break;
        }
        case PGP_SIGNATURE: {
          const vFrame = new VerifyFrame();
          vFrame.attachTo(range);
          break;
        }
        case PGP_PUBLIC_KEY: {
          const imFrame = new ImportFrame();
          imFrame.attachTo(range);
          break;
        }
      }
    } catch (e) {
      console.log('attachExtractFrame failed:', e);
    }
  }
}

/**
 * attach encrypt frame to element
 * @param  {Array} elements
 */
function attachEncryptFrame(elements) {
  // filter out attached and detached frames
  elements = elements.filter(element => !isAttached(element));
  // create new encrypt frames for new discovered editable fields
  elements.forEach(element => {
    const eFrame = new EncryptFrame();
    eFrame.attachTo(element);
  });
}

export function isAttached(element) {
  if (!element) {
    return false;
  }
  const status = element.dataset[FRAME_STATUS];
  switch (status) {
    case FRAME_ATTACHED:
    case FRAME_DETACHED:
      return true;
    default:
      return false;
  }
}

//# sourceURL=cs-mailvelope.js
