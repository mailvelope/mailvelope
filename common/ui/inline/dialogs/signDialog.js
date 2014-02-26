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

(function () {
  // communication to background page
  var port;
  // shares ID with EncryptFrame
  var id;

  function init() {
    // open port to background page
    var qs = jQuery.parseQuerystring();
    id = 'eDialog-' + qs.id;
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'sign-dialog-init', sender: id});
  }

  function load(content) {
    $('body').html(content);
    $('#okBtn')
      .attr({
        'data-loading-text': 'Busy'
      })
      .click(onOk);
    $('#cancelBtn').click(onCancel);
    $('#keyDialog').fadeIn('fast');
    // align width
    $.setEqualWidth($('#okBtn'), $('#cancelBtn'));
    $.setEqualWidth($('#addBtn'), $('#deleteBtn'));
    keyDialogPos();
  }

  function onOk() {
    $('body').addClass('busy');
    $('#okBtn').button('loading');
    port.postMessage({
      event: 'sign-dialog-ok',
      sender: id,
      signKeyId: $('#keySelect').val()
    });
    return false;
  }

  function onCancel() {
    port.postMessage({event: 'encrypt-dialog-cancel', sender: id});
    return false;
  }

  function keyDialogPos() {
    var keyDialog = $('#keyDialog');
    keyDialog.css('margin-top', Math.round(-keyDialog.outerHeight() / 2));
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'sign-dialog-content':
        load(msg.data);
        break;
      case 'signing-key-userids':
        var keySelect = $('#keySelect');
        keySelect.append(
          msg.keys.map(function(key) {
            var option = $('<option/>').val(key.id.toLowerCase()).text(key.name + ' <' + key.email + '>');
            if (key.keyid === msg.primary) {
              option.prop('selected', true);
            }
            return option;
          })
        );
        break;
      default:
        console.log('unknown event', msg.event);
    }
  }

  $(document).ready(init);

}());
