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
  // type + id
  var name;
  // dialogs
  var pwd, sandbox;
  
  function init() {
    //console.log('decryptDialog init');
    var qs = jQuery.parseQuerystring();
    id = qs['id'];
    name = 'dDialog-' + id
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-popup-init', sender: name});
    addSandbox();
    $(window).unload(onClose);
    $('#closeBtn').click(onClose);
    $('#copyBtn').click(onCopy);
  }

  function onClose() {
    port.postMessage({event: 'decrypt-dialog-cancel', sender: name});
    window.close();
  }

  function onCopy() {
    //TODO
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/css/bootstrap.min.css'
    });
    var style2 = style.clone().attr('href', '../../dep/wysihtml5/css/wysihtml5.css');
    $('.modal-body').append(sandbox);
    sandbox.contents().find('head').append(style)
                                   .append(style2);
    sandbox.contents().find('body').append(content);
  }

  function addPwdDialog() {
    pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: 'pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').append(pwd);
  }

  function showMessageArea() {
    pwd.fadeOut(function() {
      $('#decryptmail').fadeIn();
    });
  }
  
  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'decrypted-message':
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        sandbox.contents().find('#content').append(message);
        break;
      case 'show-pwd-dialog':
        addPwdDialog();
        break;
      default:
        console.log('unknown event');
    }
  }
  
  $(document).ready(init);
  
}());