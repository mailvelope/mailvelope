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
    //console.log('decryptDialog init');
    var qs = jQuery.parseQuerystring();
    id = 'dDialog-' + qs['id'];
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'decrypt-dialog-init', sender: id});
    addSandbox();
  }

  function addSandbox() {
    var sandbox = $('<iframe/>', {
      id: 'decryptmail', 
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        margin: '15px 15px 3px 3px',
        padding: '3px',
        'background-color': 'white',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../../dep/css/bootstrap.min.css'
    });
    $('body').append(sandbox);
    //sandbox.contents().find('head').append(style);
    sandbox.contents().find('body').css('background-color', 'rgba(0,0,0,0)');
    sandbox.contents().find('body').append(content);
  }

  function showMessageArea() {
    $('html, body').addClass('hide_bg');
    $('#decryptmail').fadeIn();
  }
  
  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'decrypted-message':
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        var wrapper = $('<div/>').html($.parseHTML(message));
        wrapper.find('a').attr('target', '_blank');
        $('#decryptmail').contents().find('#content').append(wrapper.contents());
        break;
      default:
        console.log('unknown event');
    }
  }
  
  $(document).ready(init);
  
}());