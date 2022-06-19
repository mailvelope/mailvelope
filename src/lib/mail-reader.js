/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Whiteout Networks GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import parseMIME from 'emailjs-mime-parser';

// parse the body parts and handle the results for the individual mime nodes
export function parse(bodyParts) {
  for (const bodyPart of bodyParts) {
    const node = parseMIME(bodyPart.raw);
    delete bodyPart.raw; // part has been parsed, we can remove the raw attribute
    bodyPart.content = []; // holds subparts, e.g. for encrypted and/or signed nodes
    // traverse through the parsed result
    walkMimeTree(node, bodyPart);
  }
  return bodyParts;
}

// functions that return true/false if they were able to handle a certain kind of body part
const mimeTreeMatchers = [matchEncrypted, matchSigned, matchAttachment, matchText, matchHtml];

// do a depth-first traversal of the body part, check for each node if it matches
// a certain type, then poke into its child nodes. not a pure inorder traversal b/c
// lookup is terminated when higher-up node can already be matched, e.g. encrypted/signed
// multipart nodes
function walkMimeTree(mimeNode, bodyPart) {
  // normalize the mime node
  normalize(mimeNode);
  // iterate through the matchers and see how to best take care of the mime node
  let i = mimeTreeMatchers.length;
  while (i--) {
    if (mimeTreeMatchers[i](mimeNode, bodyPart)) {
      return;
    }
  }
  // depth-first traverse the child nodes
  if (mimeNode.childNodes) {
    mimeNode.childNodes.forEach(childNode => {
      walkMimeTree(childNode, bodyPart);
    });
  }
}

/**
 * Matches encrypted PGP/MIME nodes
 *
 * multipart/encrypted
 * |
 * |-- application/pgp-encrypted
 * |-- application/octet-stream <-- ciphertext
 */
function matchEncrypted(node, bodyPart) {
  const isEncrypted = /^multipart\/encrypted/i.test(node.contentType.value) && node?.childNodes[1];
  if (!isEncrypted) {
    return false;
  }
  // normalize the child node
  normalize(node.childNodes[1]);
  bodyPart.content = new TextDecoder('utf-8').decode(node.childNodes[1].content);
  return true;
}

/**
 * Matches signed PGP/MIME nodes
 *
 * multipart/signed
 * |
 * |-- *** (signed mime sub-tree)
 * |-- application/pgp-signature
 */
function matchSigned(node, bodyPart) {
  const isSigned = /^multipart\/signed/i.test(node.contentType.value) && node?.childNodes[0] && node?.childNodes[1];
  if (!isSigned) {
    return false;
  }
  // normalize the child nodes
  normalize(node.childNodes[0]);
  normalize(node.childNodes[1]);
  // do the child nodes fit
  const hasSignature = /^application\/pgp-signature/i.test(node.childNodes[1].contentType.value);
  if (!hasSignature) {
    return false;
  }
  // remember the correct node to do the parsing of the nested nodes
  let part;
  if (bodyPart.type === 'signed') {
    // this mime node is the signed node we gave to the mimeparser
    part = bodyPart;
  } else {
    // this parsed mime node is part of an encrypted node
    part = {
      type: 'signed',
      content: []
    };
    bodyPart.content.push(part);
  }
  // email.js automatically converts \r\n to \n ... normalize to \r\n for signature check!
  part.signedMessage = node.childNodes[0].raw.replace(/\r/g, '').replace(/\n/g, '\r\n');
  part.signature = new TextDecoder('utf-8').decode(node.childNodes[1].content);
  // walk the mime tree to find the nested nodes
  walkMimeTree(node.childNodes[0], part);
  return true;
}

/**
 * Matches non-attachment text/plain nodes
 */
function matchText(node, bodyPart) {
  const disposition = node.headers['content-disposition'];
  const isText = (/^text\/plain/i.test(node.contentType.value) && (!disposition || disposition[0].value !== 'attachment'));
  if (!isText) {
    return false;
  }
  const content = new TextDecoder('utf-8').decode(node.content).replace(/([\r]?\n)*$/g, '');
  if (bodyPart.type === 'text') {
    // this mime node is the text node we gave to the mimeparser
    bodyPart.content = content;
  } else {
    // this mime node is part of a signed or encrypted node
    bodyPart.content.push({
      type: 'text',
      content
    });
  }
  return true;
}

/**
 * Matches non-attachment text/html nodes
 */
function matchHtml(node, bodyPart) {
  const disposition = node.headers['content-disposition'];
  const isHtml = (/^text\/html/i.test(node.contentType.value) && (!disposition || disposition[0].value !== 'attachment'));
  if (!isHtml) {
    return false;
  }
  const content = new TextDecoder('utf-8').decode(node.content).replace(/([\r]?\n)*$/g, '');
  if (bodyPart.type === 'html') {
    // this mime node is the html node we gave to the mimeparser
    bodyPart.content = content;
  } else {
    // this mime node is part of a signed or encrypted node
    bodyPart.content.push({
      type: 'html',
      content
    });
  }
  return true;
}

/**
 * Matches non-attachment text/html nodes
 */
function matchAttachment(node, bodyPart) {
  const disposition = node.headers['content-disposition'];
  const contentType = node.contentType.value;
  const isTextAttachment = /^text\//i.test(contentType) && disposition?.[0].value === 'attachment';
  const isOtherAttachment = !/^text\//i.test(contentType) && !/^multipart\//i.test(contentType);
  if (!isTextAttachment && !isOtherAttachment) {
    return false;
  }
  let part;
  if (bodyPart.type === 'attachment') {
    // this mime node is the attachment node we gave to the mimeparser
    part = bodyPart;
  } else {
    // this mime node is part of a signed or encrypted node
    part = {
      type: 'attachment'
    };
    bodyPart.content.push(part);
  }
  part.content = node.content;
  part.id ||= node.headers['content-id']?.[0].value.replace(/[<>]/g, '');
  part.mimeType ||= contentType;
  part.filename ||= disposition?.[0].params.filename || node.contentType.params.name || 'attachment';
  return true;
}

/**
 * Normalizes a mime node where necessary
 * - add contentType
 * - add contentType params
 * - add content
 * - add raw
 * - normalize content-id
 * - normalize content-disposition
 */
function normalize(node) {
  // normalize the optional content-type, fallback to 'application/octet-stream'
  node.contentType ||= {};
  node.contentType.value ||= 'application/octet-stream';
  node.contentType.params ||= {};
  // normalize the contents
  node.raw ||= '';
  node.content ||= new Uint8Array();
  // optional
  if (node.headers['content-id']) {
    // node has content-id set, let's normalize it
    node.headers['content-id'][0] ||= {};
    node.headers['content-id'][0].value ||= '';
  }
  // optional
  if (node.headers['content-disposition']) {
    // this is an attachment node, let's normalize node.headers['content-disposition']
    node.headers['content-disposition'][0] ||= {};
    node.headers['content-disposition'][0].value ||= '';
    node.headers['content-disposition'][0].params ||= {};
  }
}
