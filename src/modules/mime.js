/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {html2text, encodeHTML, ab2str, text2html, byteCount, MvError} from '../lib/util';
import * as mailreader from '../lib/mail-reader';
import MimeBuilder from 'emailjs-mime-builder';

/**
 * Parse email content
 * @param  {String} rawText
 * @param  {Object<onAttachment, onMessage>} handlers
 * @param  {[type]} encoding 'html' or 'text'
 * @return {[type]}          [description]
 */
export async function parseMessage(rawText, handlers, encoding) {
  if (/^\s*(MIME-Version|Content-Type|Content-Transfer-Encoding|From|Date|Content-Language):/.test(rawText)) {
    await parseMIME(rawText, handlers, encoding);
  } else {
    await parseInline(rawText, handlers, encoding);
  }
}

function parseMIME(rawText, handlers, encoding) {
  return new Promise(resolve => {
    // mailreader expects rawText in pseudo-binary
    rawText = unescape(encodeURIComponent(rawText));
    mailreader.parse([{raw: rawText}], parsed => {
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
      resolve();
    });
  });
}

async function parseInline(rawText, handlers, encoding) {
  if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(rawText)) {
    // legacy html mode
    if (encoding === 'html') {
      const sanitized = mvelo.util.sanitizeHTML(rawText);
      handlers.onMessage(sanitized);
    } else if (encoding === 'text') {
      handlers.onMessage(html2text(rawText));
    }
  } else {
    // plain text
    if (encoding === 'html') {
      handlers.onMessage(text2html(rawText));
    } else if (encoding === 'text') {
      handlers.onMessage(rawText);
    }
  }
}

// attribution: https://github.com/whiteout-io/mail-html5
function filterBodyParts(bodyParts, type, result) {
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
