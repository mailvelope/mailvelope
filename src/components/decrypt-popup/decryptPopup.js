/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

'use strict';

var mvelo = mvelo || null;

(function() {
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  // type + id
  var name;
  // dialogs
  var pwd;
  let decryptComponent;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'dPopup-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    $('#closeBtn').click(onCancel);
    $('#copyBtn').click(onCopy);
    $('body').addClass('spinner');
    $(window).on('beforeunload', onClose);
    addDecryptComponent();
    mvelo.l10n.localizeHTML();
    if (mvelo.ffa) {
      // doc.execCommand('copy') not working on Firefox
      $('#copyBtn').hide()
    }
  }

  function onCancel() {
    $(window).off('beforeunload');
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    return false;
  }

  function onClose() {
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
  }

  function onCopy() {
    // copy to clipboard
    var doc = decryptComponent.contents().find('#decryptmail').contents().get(0);
    var sel = doc.defaultView.getSelection();
    sel.selectAllChildren($(doc).find('#content').get(0));
    doc.execCommand('copy');
    sel.removeAllRanges();
  }

  function addDecryptComponent() {
    decryptComponent = $('<iframe/>', {
      src: '../decrypt-inline/decryptInline.html?id=' + id,
      css: {
        position: 'absolute',
        top: "0px",
        left: 0,
        right: 0,
        bottom: 0
      },
      frameBorder: 0
    });
    $('.modal-body').append(decryptComponent);
  }

  function addPwdDialog(id) {
    pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: '../enter-password/pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').append(pwd);
  }

  function showMessageArea() {
    if (pwd) {
      pwd.fadeOut(function() {
        $('#decryptmail').fadeIn();
      });
    } else {
      $('#decryptmail').fadeIn();
    }
  }

  function messageListener(msg) {
    // remove spinner for all events
    $('body').removeClass('spinner');
    switch (msg.event) {
      case 'show-pwd-dialog':
        addPwdDialog(msg.id);
        break;
      case 'show-message':
        showMessageArea();
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
