/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {html2text, encodeHTML, ab2str, byteCount, MvError, getUUID} from '../lib/util';
import * as mailreader from '../lib/mail-reader';
import MimeBuilder from 'emailjs-mime-builder';

/**
 * Parse email content
 * @param  {String} rawText
 * @param  {Object<onAttachment, onMessage>} handlers
 * @param  {[type]} encoding 'html' or 'text'
 * @return {[type]}          [description]
 */
export function parseMessage(rawText, handlers, encoding) {
  if (/^\s*(MIME-Version|Content-Type|Content-Class|Content-Transfer-Encoding|Content-ID|Content-Description|Content-Disposition|Content-Language|From|Date):/.test(rawText)) {
    parseMIME(rawText, handlers, encoding);
  } else {
    parseInline(rawText, handlers, encoding);
  }
}

function parseMIME(rawText, handlers, encoding) {
  const parsed = mailreader.parse([{raw: rawText}]);
  if (parsed && parsed.length > 0) {
    const htmlParts = [];
    const textParts = [];
    if (encoding === 'html') {
      filterBodyParts(parsed, 'html', htmlParts);
      if (htmlParts.length) {
        const sanitized = mvelo.util.sanitizeHTML(htmlParts.map(part => part.content).join('\n<hr>\n'));
        handlers.onMessage(sanitized);
      } else {
        filterBodyParts(parsed, 'text', textParts);
        if (textParts.length) {
          handlers.onMessage(textParts.map(part => mvelo.util.text2autoLinkHtml(part.content)).join('<hr>'));
        }
      }
    } else if (encoding === 'text') {
      filterBodyParts(parsed, 'text', textParts);
      if (textParts.length) {
        handlers.onMessage(textParts.map(part => part.content).join('\n\n'));
      } else {
        filterBodyParts(parsed, 'html', htmlParts);
        if (htmlParts.length) {
          handlers.onMessage(htmlParts.map(part => html2text(part.content)).join('\n\n'));
        }
      }
    }
    const attachmentParts = [];
    filterBodyParts(parsed, 'attachment', attachmentParts);
    attachmentParts.forEach(part => {
      part.filename = encodeHTML(part.filename);
      part.content = ab2str(part.content.buffer);
      handlers.onAttachment(part);
    });
  }
  if (handlers.noEvent) {
    handlers.onMessage('');
  }
}

function parseInline(rawText, handlers, encoding) {
  if (encoding === 'html') {
    handlers.onMessage(mvelo.util.text2autoLinkHtml(rawText));
  } else {
    if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
      // legacy html mode
      handlers.onMessage(html2text(rawText));
    } else {
      // plain text
      handlers.onMessage(rawText);
    }
  }
}

// attribution: https://github.com/whiteout-io/mail-html5
export function filterBodyParts(bodyParts, type, result) {
  result = result || [];
  bodyParts.forEach(part => {
    if (part.type === type) {
      result.push(part);
    } else if (Array.isArray(part.content)) {
      filterBodyParts(part.content, type, result);
    }
  });
  return result;
}

/**
 * @param {String} message
 * @param {Map} attachments
 * @param {String} attachments.filename
 * @param {String} attachments.content
 * @param {Integer} attachments.size
 * @param {String} attachments.type
 * @returns {String | null}
 */
export function buildMail({message, attachments, quota, pgpMIME}) {
  const mainMessage = new MimeBuilder('multipart/mixed');
  let composedMessage = null;
  let hasAttachment;
  let quotaSize = 0;
  if (message) {
    quotaSize += byteCount(message);
    const textMime = new MimeBuilder('text/plain')
    .setHeader({'content-transfer-encoding': 'quoted-printable'})
    .setContent(message);
    mainMessage.appendChild(textMime);
  }
  if (attachments && attachments.length > 0) {
    hasAttachment = true;
    for (const attachment of attachments) {
      quotaSize += attachment.size;
      const attachmentMime = new MimeBuilder('multipart/mixed')
      .createChild(null, {filename: attachment.name})
      .setHeader({
        'content-transfer-encoding': 'base64',
        'content-disposition': 'attachment'
      })
      .setContent(attachment.content);
      mainMessage.appendChild(attachmentMime);
    }
  }
  if (quota && (quotaSize > quota)) {
    throw new MvError('Mail content exceeds quota limit.', 'ENCRYPT_QUOTA_SIZE');
  }
  if (hasAttachment || pgpMIME) {
    composedMessage = mainMessage.build();
  } else {
    composedMessage = message;
  }
  return composedMessage;
}

export function buildMailWithHeader({message, attachments, sender, to, cc, subject, quota, continuationEncode = true}) {
  const mainMessage = new MimeBuilder('multipart/mixed');
  const headers = {
    from: sender,
    to: to.join(', '),
    subject
  };
  if (cc && cc.length) {
    headers.cc = cc.join(', ');
  }
  mainMessage.addHeader(headers);
  let quotaSize = 0;
  if (message) {
    quotaSize += byteCount(message);
    const textMime = new MimeBuilder('text/plain')
    .setHeader({'content-transfer-encoding': 'quoted-printable'})
    .setContent(message);
    mainMessage.appendChild(textMime);
  }
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      quotaSize += attachment.size;
      const id = `mv_${getUUID()}`;
      const attachmentMime = new MimeBuilder('multipart/mixed')
      .createChild(null, {filename: attachment.name, continuationEncode})
      .setHeader({
        'content-transfer-encoding': 'base64',
        'content-disposition': 'attachment',
        'X-Attachment-Id': id,
        'Content-ID': `<${id}>`
      })
      .setContent(attachment.content);
      mainMessage.appendChild(attachmentMime);
    }
  }
  if (quota && (quotaSize > quota)) {
    throw new MvError('Mail content exceeds quota limit.', 'ENCRYPT_QUOTA_SIZE');
  }
  return mainMessage.build();
}
