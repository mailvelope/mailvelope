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
  // shares ID with DecryptFrame
  var id;
  var l10n;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = 'importKeyDialog-' + qs.id;
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'key-import-dialog-init', sender: id});
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('form').on('submit', onOk);
    window.onbeforeunload = function() {
      onCancel();
    };
    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground();
  }

  function onOk() {
    $(window).off('unload');
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    $('.modal-body').css('opacity', '0.4');
    port.postMessage({event: 'key-import-dialog-ok', sender: id});
    $('#okBtn').prop('disabled', true);
    return false;
  }

  function onCancel() {
    $(window).off('unload');
    port.postMessage({event: 'key-import-dialog-cancel', sender: id});
    return false;
  }

  function messageListener(msg) {
    //console.log('key import dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'key-details':
        $('#userId').val(msg.key.userId);
        $('#fingerprint').val(msg.key.fingerprint.match(/.{1,4}/g).join(' '));
        break;
      case 'import-error':
        $('#okBtn').prop('disabled', false);
        $('body').removeClass('busy');
        $('#spinner').hide();
        $('.modal-body').css('opacity', '1');
        $('#importAlert').showAlert('Error', msg.message, 'danger');
        $('#okBtn').prop('disabled', true);
        break;
      case 'import-warning':
        $('body').removeClass('busy');
        $('#spinner').hide();
        $('.modal-body').css('opacity', '1');
        $('#importAlert').showAlert('Warning', msg.message, 'warning');
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);

}());
