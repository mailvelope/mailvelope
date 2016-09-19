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
  var id, name, port, l10n;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'importKeyDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);

    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('#closeBtn').click(onCancel);
    $('form').on('submit', onOk);
    $('closeFooter').hide();

    $(window).on('beforeunload', onClose);

    mvelo.l10n.getMessages([
      'key_import_default_headline',
      'key_import_default_description',
      'key_import_invalidated_headline',
      'key_import_invalidated_description'
    ], function(result) {
      l10n = result;
    });

    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground();
    port.postMessage({event: 'key-import-dialog-init', sender: name});
  }

  function onOk() {
    $(window).off('beforeunload');
    logUserInput('security_log_dialog_ok');
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    $('.modal-body').css('opacity', '0.4');
    port.postMessage({event: 'key-import-dialog-ok', sender: name});
    $('#okBtn').prop('disabled', true);
    return false;
  }

  function onCancel() {
    $(window).off('beforeunload');
    logUserInput('security_log_dialog_cancel');
    port.postMessage({event: 'key-import-dialog-cancel', sender: name});
    return false;
  }

  function onClose() {
    port.postMessage({event: 'key-import-dialog-cancel', sender: name});
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'key-import-user-input',
      sender: name,
      source: 'security_log_import_dialog',
      type: type
    });
  }

  function messageListener(msg) {
    //console.log('key import dialog messageListener: ', JSON.stringify(msg));
    var $okBtn = $('okBtn');
    var $body = $('body');
    var $spinner = $('#spinner');
    var $modalBody = $('.modal-body');
    var $importAlert = $('#importAlert');

    switch (msg.event) {
      case 'key-details':
        var importDialogHeadline = (msg.invalidated) ? l10n.key_import_invalidated_headline : l10n.key_import_default_headline;
        var importDialogDescription = (msg.invalidated) ? l10n.key_import_invalidated_description : l10n.key_import_default_description;

        var userName = $('<span/>').addClass('userName').text(msg.key.name);
        var userEmail = $('<span/>').addClass('userEmail').text('(' + msg.key.email + ')');
        var date = (new Date(msg.key.crDate)).toLocaleString();
        var contact = msg.key.email ? msg.key.email : msg.key.name;
        importDialogDescription = importDialogDescription.replace('[CONTACT]', '<em>' + contact.replace(/\((.*|\s)\)/, '') + '</em>');

        $('#key_import_headline').html(importDialogHeadline);
        $('#key_import_default_description').html(importDialogDescription);

        if (msg.key.email) {
          $('.userId').empty().append(userName, ' ', userEmail);
        } else {
          $('.userId').empty().append(userName);
        }
        $('.fingerprint').text(msg.key.fingerprint.match(/.{1,4}/g).join(' '));
        $('.createDate').text(date);

        if (msg.invalidated) {
          $('#closeFooter').show();
          $('#defaultFooter').hide();
        } else {
          $('#closeFooter').hide();
          $('#defaultFooter').show();
        }
        break;
      case 'import-error':
        $(window).on('beforeunload', onClose);
        $okBtn.prop('disabled', false);
        $body.removeClass('busy');
        $spinner.hide();
        $modalBody.css('opacity', '1');
        $importAlert.showAlert('Error', msg.message, 'danger');
        $okBtn.prop('disabled', true);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
