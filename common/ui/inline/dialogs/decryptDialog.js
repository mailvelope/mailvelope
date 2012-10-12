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

(function() {
  // communication to background page
  var port;
  // shares ID with DecryptFrame
  var id;
  
  function init() {
    console.log('decryptDialog init');
    var qs = jQuery.parseQuerystring();
    id = 'dDialog-' + qs['id'];
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-dialog-init', sender: id});
  }

  function load(content) {
    console.log('load content');
    $('body').html(content);
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('#pwdbox').fadeIn('fast');
    // align width
    $.setEqualWidth($('#okBtn'), $('#cancelBtn'));
    pwdBoxPos();
    $('#password').focus();
  }
  
  function onOk() {
    var pwd = $('#password').val();
    $('body').addClass('busy');
    port.postMessage({event: 'decrypt-dialog-ok', sender: id, password: pwd});
    return false;
  }
  
  function onCancel() {
    port.postMessage({event: 'decrypt-dialog-cancel', sender: id});
    return false;
  }
  
  function pwdBoxPos() {
    var pwdBox = $('#pwdbox');
    pwdBox.css('margin-top', Math.round(-pwdBox.outerHeight() / 2)); 
  }
  
  function messageListener(msg) {
    console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'decrypt-dialog-content':
        load(msg.data);
        break;
      case 'message-userid':
        if (msg.error) {
          $('#password').addClass('hide');
          $('#decryptAlert').showAlert('Error', msg.error.message, 'error');
          $('#okBtn').attr('disabled', 'disabled');
        } else {
          $('#keyId').text(msg.keyid);
          if (msg.userid != '') {
            $('#userId').text(msg.userid);
          } else {
           $('#userId').text('Unknown');
           $('#password').addClass('hide');
           $('#decryptAlert').showAlert(undefined, 'No private key found for this message!', 'error')
           $('#okBtn').attr('disabled', 'disabled');
          }
        }
        break;
      case 'decrypted-message':
        $('body').removeClass('busy');
        if (msg.error) {
          if (msg.error.type === 'wrong-password') {
            $('#password').closest('.control-group').addClass('error')
                          .end().next().removeClass('hide');
          } else {
            $('#password').addClass('hide');
            $('#decryptAlert').showAlert('Error', 'Could not decrypt this message', 'error')
          }
        } else {
          $('#pwdbox').fadeOut();
          // parseHTML to filter out <script>, inline js will not be filtered out but
          // execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
          $('#decryptmail').html($.parseHTML(msg.message))
                           .fadeIn();
          $('html, body').addClass('hide_bg');
        }
        break;
      default:
        console.log('unknown event');
    }
  }
  
  $(document).ready(init);
  
}());