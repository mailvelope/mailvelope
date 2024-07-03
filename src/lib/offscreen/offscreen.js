/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import dompurify from 'dompurify';

// Add a hook to make all links open a new window
// attribution: https://github.com/cure53/DOMPurify/blob/master/demos/hooks-target-blank-demo.html
dompurify.addHook('afterSanitizeAttributes', node => {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noreferrer noopener');
  }
  // set MathML links to xlink:show=new
  if (!node.hasAttribute('target') &&
      (node.hasAttribute('xlink:href') ||
       node.hasAttribute('href'))) {
    node.setAttribute('xlink:show', 'new');
  }
});

chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message, sender, sendResponse) {
  if (message.target !== 'offscreen') {
    return false;
  }
  let result;
  switch (message.type) {
    case 'sanitize-html':
      result = sanitizeHTML(message.data);
      break;
    case 'get-hostname':
      result = getHostname(message.data);
      break;
    case 'get-protocol':
      result = getProtocol(message.data);
      break;
    case 'get-domain':
      result = getDomain(message.data);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
      return;
  }
  sendResponse(result);
  return true;
}

function sanitizeHTML(html) {
  const sanitzed = dompurify.sanitize(html);
  console.log(sanitzed);
  return sanitzed;
}

function getHostname(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.hostname;
}

function getProtocol(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.protocol.replace(/:/g, '');
}

function getDomain(url) {
  const hostname = getHostname(url);
  // limit to 3 labels per domain
  return hostname.split('.').slice(-3).join('.');
}
