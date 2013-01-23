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
    $('body').addClass('busy');
    port.postMessage({event: 'pwd-dialog-ok', sender: id, password: pwd});
    return false;
  }
  
  function onCancel() {
    port.postMessage({event: 'pwd-dialog-cancel', sender: id});
    window.close();
    return false;
  }

  function showError(heading, message) {
    $('#pwdGroup').addClass('hide');
    $('#decryptAlert').showAlert(heading, message, 'error');
    $('#okBtn').attr('disabled', 'disabled'); 
  }

  function increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
  }

  function getStyle(hex) {
    var normal = '#' + hex;
    var bright = increase_brightness(hex, 35);
    var style = 'background-color: ' + normal + ';';
    style += 'background-image: -moz-linear-gradient(top, ' + bright + ', ' + normal + ');';
    style += 'background-image: -webkit-gradient(linear, 0 0, 0 100%, from(' + bright + '), to(' + normal + '));';
    style += 'background-image: -webkit-linear-gradient(top, ' + bright + ', ' + normal + ');';
    style += 'background-image: linear-gradient(to bottom, ' + bright + ', ' + normal + ');';
    return style;
  }
  
  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'message-userid':
        $('#secureCode').html(msg.secCode)
                        .attr('style', getStyle(msg.secColor));
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
        }
        break;
      case 'pwd-verification':
        $('body').removeClass('busy');
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
