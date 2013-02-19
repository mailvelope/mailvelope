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
    var qs = jQuery.parseQuerystring();
    id = 'pwdDialog-' + qs['id'];
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'pwd-dialog-init', sender: id});
    $('#okBtn').click(onOk);
    $('#cancelBtn').click(onCancel);
    $('form').on('submit', onOk);
    $(window).unload(function() {
      port.postMessage({event: 'pwd-dialog-cancel', sender: id});
    });
    $('#password').focus();
  }
  
  function onOk() {
    var pwd = $('#password').val();
    var cache = $('#remember').attr('checked') == 'checked';
    $('body').addClass('busy'); // https://bugs.webkit.org/show_bug.cgi?id=101857
    $('#spinner').show();
    port.postMessage({event: 'pwd-dialog-ok', sender: id, password: pwd, cache: cache});
    return false;
  }
  
  function onCancel() {
    port.postMessage({event: 'pwd-dialog-cancel', sender: id});
    top.close();
    return false;
  }

  function showError(heading, message) {
    $('#pwdGroup, #rememberGroup').addClass('hide');
    $('#decryptAlert').showAlert(heading, message, 'error');
    $('#okBtn').attr('disabled', 'disabled'); 
  }
  
  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'message-userid':
        if (msg.error) {
          showError('Error', msg.error.message);
        } else {
          $('#keyId').text(msg.keyid);
          if (msg.userid != '') {
            $('#userId').text(msg.userid);
          } else {
            $('#userId').text('Unknown');
            showError(undefined, 'No private key found for this message!');
          }
          if (msg.cache) {
            $('#remember').attr('checked', 'checked');
          }
        }
        break;
      case 'pwd-verification':
        $('body').removeClass('busy');
        $('#spinner').hide();
        if (msg.error) {
          if (msg.error.type === 'wrong-password') {
            $('#password').closest('.control-group').addClass('error')
                          .end().next().removeClass('hide');
          } else {
            showError('Error', 'Could not decrypt this message');
          }
        } else {
          window.close();
        }
        break;
      default:
        console.log('unknown event');
    }
  }
  
  $(document).ready(init);
  
}());
