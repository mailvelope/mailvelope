/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import MimeBuilder from 'emailjs-mime-builder';
import * as l10n from '../lib/l10n';
import mvelo from '../lib/lib-mvelo';
import * as mailreader from '../lib/mail-reader';
import {ab2str, byteCount, encodeHTML, getUUID, html2text, MvError} from '../lib/util';

/**
 * Parse encrypted email content. Input content can be in MIME format or plain text.
 * @param  {String} raw - content
 * @param  {String} encoding - encoding of output, 'html' or 'text'
 * @return {Object<message, attachments>} parsed content separated in message and attachments
 */
export function parseMessage(raw, encoding) {
  if (/^\s*(MIME-Version|Content-Type|Content-Class|Content-Transfer-Encoding|Content-ID|Content-Description|Content-Disposition|Content-Language|From|Date):/.test(raw)) {
    return parseMIME(raw, encoding);
  } else {
    return parseInline(raw, encoding);
  }
}

async function parseMIME(raw, encoding) {
  let message = '';
  const attachments = [];
  const parsed = mailreader.parse([{raw}]);
  if (parsed?.length) {
    const htmlParts = [];
    const textParts = [];
    if (encoding === 'html') {
      filterBodyParts(parsed, 'html', htmlParts);
      if (htmlParts.length) {
        message = await mvelo.util.sanitizeHTML(htmlParts.map(part => part.content).join('\n<hr>\n'));
      } else {
        filterBodyParts(parsed, 'text', textParts);
        if (textParts.length) {
          message = await mvelo.util.text2autoLinkHtml(textParts.map(part => part.content).join('\n<hr>\n'));
        }
      }
    } else if (encoding === 'text') {
      filterBodyParts(parsed, 'text', textParts);
      if (textParts.length) {
        message = textParts.map(part => part.content).join('\n\n');
      } else {
        filterBodyParts(parsed, 'html', htmlParts);
        if (htmlParts.length) {
          message = htmlParts.map(part => html2text(part.content)).join('\n\n');
        }
      }
    }
    filterBodyParts(parsed, 'attachment', attachments);
    for (const part of attachments) {
      part.filename = encodeHTML(part.filename);
      part.content = ab2str(part.content.buffer);
    }

    // prepend subject line using i18n label
    const subject = parsed[0].subject;
    if (subject) {
      const subjectLabel = l10n.get('editor_label_subject');
      message = `<strong>${subjectLabel}: </strong>${encodeHTML(subject)}\n<hr>\n${message}`;
    }
  }
  return {message, attachments, parsed};
}

async function parseInline(raw, encoding) {
  let message = '';
  if (encoding === 'html') {
    message = await mvelo.util.text2autoLinkHtml(raw);
  } else {
    if (/(<\/a>|<br>|<\/div>|<\/p>|<\/b>|<\/u>|<\/i>|<\/ul>|<\/li>)/.test(raw)) {
      // legacy html mode
      message = html2text(raw);
    } else {
      // plain text
      message = raw;
    }
  }
  return {message, attachments: []};
}

/**
 * Parse message with detached signature
 * @param  {String} raw - content
 * @param  {String} encoding - encoding of output, 'html' or 'text'
 * @return {Object<message, signedMessage, attachments>} parsed content separated in message, signed content and attachments
 */
export async function parseSignedMessage(raw, encoding) {
  const {message, attachments, parsed} = await parseMIME(raw, encoding);
  const [{signedMessage}] = filterBodyParts(parsed, 'signed');
  return {message, signedMessage, attachments};
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
 * @param {Boolean} skipMandatoryHeaders - if true, wraps content in a child node to avoid auto-generated headers
 * @returns {String | null}
 */
export function buildMail({message, attachments, quota, pgpMIME, msgEncoding, format, skipMandatoryHeaders}) {
  if (!attachments?.length && !pgpMIME) {
    return message;
  }
  const rootNode = skipMandatoryHeaders ? new MimeBuilder('message/rfc822') : null;
  const mainMessage = skipMandatoryHeaders ? rootNode.createChild('multipart/mixed') : new MimeBuilder('multipart/mixed');
  let mailSize = 0;
  if (message) {
    mailSize += byteCount(message);
    const textMime = new MimeBuilder('text/plain')
    .setHeader({'content-transfer-encoding': `${msgEncoding ? msgEncoding : 'quoted-printable'}`})
    .setContent(message);
    mainMessage.appendChild(textMime);
  }
  if (attachments?.length) {
    for (const attachment of attachments) {
      mailSize += attachment.size;
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
  if (quota && (mailSize > quota)) {
    throw new MvError('Mail content exceeds quota limit.', 'ENCRYPT_QUOTA_SIZE');
  }
  return format === 'object' ? mainMessage : mainMessage.build();
}

export function buildSignedMail({contentNode, signature, skipMandatoryHeaders}) {
  // TODO set micalg correctly
  const rootNode = skipMandatoryHeaders ? new MimeBuilder('message/rfc822') : null;
  const mainMessage = skipMandatoryHeaders ? rootNode.createChild('multipart/signed; micalg=pgp-sha256; protocol="application/pgp-signature";') : new MimeBuilder('multipart/signed; micalg=pgp-sha256; protocol="application/pgp-signature";');
  mainMessage.appendChild(contentNode);
  const signatureNode = new MimeBuilder('application/pgp-signature');
  signatureNode.setHeader({'content-disposition': 'attachment; filename="OpenPGP_signature.asc"'})
  .setContent(signature);
  mainMessage.appendChild(signatureNode);
  return mainMessage.build();
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
  let mailSize = 0;
  if (message) {
    mailSize += byteCount(message);
    const textMime = new MimeBuilder('text/plain')
    .setHeader({'content-transfer-encoding': 'quoted-printable'})
    .setContent(message);
    mainMessage.appendChild(textMime);
  }
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      mailSize += attachment.size;
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
  if (quota && (mailSize > quota)) {
    throw new MvError('Mail content exceeds quota limit.', 'ENCRYPT_QUOTA_SIZE');
  }
  return mainMessage.build();
}
