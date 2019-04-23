/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2019 Mailvelope GmbH
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

import {localizeHTML} from '../../lib/l10n.js';
import {isWebEx} from '../../lib/util.js';
import EventHandler from '../../lib/EventHandler.js';

// communication to background page
let port;
// shares ID with DecryptFrame
let id;
// dialogs
let pwd;
let decryptComponent;

function init() {
  const qs = jQuery.parseQuerystring();
  id = qs.id;
  // open port to background page
  port = EventHandler.connect(`dPopup-${id}`);
  registerEventListeners();
  $('#closeBtn').click(onCancel);
  $('#copyBtn').click(onCopy);
  $('body').addClass('spinner');
  addDecryptComponent();
  localizeHTML();
  if (isWebEx) {
    // doc.execCommand('copy') not working on Firefox
    $('#copyBtn').hide();
  }
}

function registerEventListeners() {
  port.on('show-pwd-dialog', addPwdDialog);
  port.on('show-message', showMessageArea);
}

function onCancel() {
  port.emit('decrypt-dialog-cancel');
  return false;
}

function onCopy() {
  // copy to clipboard
  const doc = decryptComponent.contents().find('#decryptmail').contents().get(0);
  const sel = doc.defaultView.getSelection();
  sel.selectAllChildren($(doc).find('#content').get(0));
  doc.execCommand('copy');
  sel.removeAllRanges();
}

function addDecryptComponent() {
  decryptComponent = $('<iframe/>', {
    src: `../decrypt-message/decryptMessage.html?id=${id}`,
    css: {
      position: 'absolute',
      top: '0px',
      left: 0,
      right: 0,
      bottom: 0
    },
    frameBorder: 0
  });
  $('.modal-body').append(decryptComponent);
}

function addPwdDialog({id}) {
  $('body').removeClass('spinner');
  pwd = $('<iframe/>', {
    id: 'pwdDialog',
    src: `../enter-password/passwordDialog.html?id=${id}`,
    frameBorder: 0
  });
  $('body').append(pwd);
}

function showMessageArea() {
  $('body').removeClass('spinner');
  if (pwd) {
    pwd.fadeOut(() => {
      $('#decryptmail').fadeIn();
    });
  } else {
    $('#decryptmail').fadeIn();
  }
}

$(document).ready(init);
