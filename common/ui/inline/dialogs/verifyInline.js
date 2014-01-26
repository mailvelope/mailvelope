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
  // shares ID with VerifyFrame
  var id;
  var watermark;
  var spinnerTimer;
  
  function init() {
    //console.log('init decryptInline.js');
    var qs = jQuery.parseQuerystring();
    id = 'vDialog-' + qs.id;
    // open port to background page
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'verify-inline-init', sender: id});
    addWrapper();
    addSandbox();
    mvelo.extension.sendMessage({event: "get-security-token"}, function (token) {
      $('#watermark').html(token.code);
    });
    $(window).on('resize', resizeFont);
    addErrorView();
    // show spinner
    spinnerTimer = setTimeout(showSpinner, 600);
  }

  function showSpinner() {
    $('body').addClass('spinner');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('body').addClass('spinner-large');
    }
  }

  function addWrapper() {
    var wrapper = $('<div/>', {id: 'wrapper'});
    watermark = $('<div/>', {id: 'watermark'});
    watermark.appendTo(wrapper);
    wrapper.appendTo('body');
  }

  function addSandbox() {
    var sandbox = $('<iframe/>', {
      id: 'verifymail',
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '3px',
        'background-color': 'rgba(0,0,0,0)',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../../dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', '../../../dep/wysihtml5/css/wysihtml5.css');
    $('#wrapper').append(sandbox);
    sandbox.contents().find('head').append(style)
                                   .append(style2);
    sandbox.contents().find('body').css('background-color', 'rgba(0,0,0,0)');
    sandbox.contents().find('body').append(content);
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well span5'}).appendTo(errorbox);
    errorbox.appendTo('body');
    if ($('body').height() + 2 > mvelo.LARGE_FRAME) {
      $('#errorbox').addClass('errorbox-large');
    }
  }

  function showMessageArea() {
    $('html, body').addClass('hide_bg');
    $('#wrapper').fadeIn();
    resizeFont();
  }

  function showErrorMsg(msg) {
    $('body').removeClass('spinner');
    clearTimeout(spinnerTimer);
    $('#errorbox').show();
    $('#errorwell').showAlert('Error', msg, 'error')
                   .find('.alert').prepend($('<button/>', {type: 'button', class: 'close', html: '&times;'}))
                   .find('button').click(function () {
                      port.postMessage({event: 'verify-dialog-cancel', sender: id});
                    });
  }

  function resizeFont() {
    watermark.css('font-size', Math.floor(Math.min(watermark.width() / 3, watermark.height())));
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'verified-message':
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        $('#verifymail').contents().find('#content').append(message);
        $('#verifymail').parent('#wrapper').addClass(msg.verified ? 'verified' : 'unknown');
        break;
      case 'error-message':
        showErrorMsg(msg.error);
        break;
      default:
        console.log('unknown event');
    }
  }
  
  $(document).ready(init);
  
}());
