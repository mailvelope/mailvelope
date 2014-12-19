/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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
  // shares ID with EncryptFrame
  var id;
  var l10n;

  function init() {
    // open port to background page
    var qs = jQuery.parseQuerystring();
    id = 'eDialog-' + qs.id;
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    mvelo.l10n.getMessages([
      'encrypt_dialog_no_recipient',
      'encrypt_dialog_add',
      'encrypt_dialog_header',
      'keygrid_delete',
      'form_cancel',
      'form_ok'
    ], function(result) {
      port.postMessage({event: 'encrypt-dialog-init', sender: id});
      l10n = result;
    });
  }

  function load(content) {
    $('body').html(content);
    mvelo.l10n.localizeHTML(l10n);
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('#addBtn').click(onAdd);
    $('#deleteBtn').click(onDelete);
    $('#keyDialog').fadeIn('fast');
    // align width
    $.setEqualWidth($('#okBtn'), $('#cancelBtn'));
    $.setEqualWidth($('#addBtn'), $('#deleteBtn'));
    keyDialogPos();
  }

  function onOk() {
    if ($('#keyList').hasClass('alert-error')) {
      return false;
    }
    // get keys from list
    var recipient = [];
    $('#keyList option').each(function() {
      recipient.push($(this).val());
    });
    if (recipient.length === 0) {
      // show error
      $('#keyList').addClass('alert-error');
      $('<option/>').text(l10n.encrypt_dialog_no_recipient).appendTo($('#keyList'));
    } else {
      $('body').addClass('busy');
      port.postMessage({
        event: 'encrypt-dialog-ok',
        sender: id,
        recipient: recipient,
        type: $('input:radio[name="encodeRadios"]:checked').val()
      });
    }
    return false;
  }

  function onCancel() {
    port.postMessage({event: 'encrypt-dialog-cancel', sender: id});
    return false;
  }

  function onAdd() {
    // remove possible error
    if ($('#keyList').hasClass('alert-error')) {
      $('#keyList').removeClass('alert-error')
                   .empty();
    }
    var selected = $('#keySelect option:selected');
    // add selection to key list
    $('<option/>').val(selected.val()).text(selected.text()).appendTo($('#keyList'));
    // find next proposal
    var option = selected.next();
    while (option.length !== 0) {
      if (option.data('proposal')) {
        option.prop('selected', true);
        break;
      }
      option = option.next();
    }
    selected.prop('selected', false);
    if (option.length === 0) {
      // no further proposal found, get back to next of selected
      option = selected.next();
      if (option.length === 0) {
        // jump back to first element
        selected.siblings().first().prop('selected', true);
      } else {
        // select next non-proposal element
        option.prop('selected', true);
      }
    }
  }

  function onDelete() {
    $('#keyList option:selected').remove();
  }

  function keyDialogPos() {
    var keyDialog = $('#keyDialog');
    keyDialog.css('margin-top', Math.round(-keyDialog.outerHeight() / 2));
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'encrypt-dialog-content':
        load(msg.data);
        break;
      case 'public-key-userids':
        var keySelect = $('#keySelect');
        var firstProposal = true;
        msg.keys.forEach(function(key) {
          var option = $('<option/>').val(key.keyid).text(key.userid);
          if (key.keyid === msg.primary) {
            $('#keyList').append(option.clone());
            key.proposal = false;
          }
          if (key.proposal) {
            option.data('proposal', key.proposal);
            if (firstProposal) {
              // set the first proposal as selected
              option.prop('selected', true);
              firstProposal = false;
            }
          }
          option.appendTo(keySelect);
        });
        break;
      case 'encoding-defaults':
        if (msg.defaults.type === 'text') {
          $('#encodeText').prop('checked', true);
        } else {
          $('#encodeHTML').prop('checked', true);
        }
        if (!msg.defaults.editable) {
          $('input[name="encodeRadios"]').prop('disabled', true);
        }
        $('#encoding').show();
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
