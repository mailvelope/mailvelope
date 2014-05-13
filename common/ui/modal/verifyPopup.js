/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
 * Copyright (C) 2014  Julian Bäume
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
  // shares ID with VerifyFrame
  var id;
  // type + id
  var name;
  // dialogs
  var sandbox;

  function init() {
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'vDialog-' + id;
    // open port to background page
    port = mvelo.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'verify-popup-init', sender: name});
    addSandbox();
    addErrorView();
    $(window).on('unload', onClose);
    $('#closeBtn').click(onClose);
    $('#copyBtn').click(onCopy);
    $('body').addClass('spinner');
  }

  function onClose() {
    $(window).off('unload');
    port.postMessage({event: 'verify-dialog-cancel', sender: name});
    return false;
  }

  function onCopy() {
    // copy to clipboard
    var doc = sandbox.contents().get(0);
    var sel = doc.defaultView.getSelection();
    sel.selectAllChildren(sandbox.contents().find('#content').get(0));
    doc.execCommand('copy');
    sel.removeAllRanges();
  }

  function addSandbox() {
    sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var header = $('<header/>', {
      css: {
        'border-bottom': '1px solid rgba(0,0,0,0.2)'
      }
    });
    var content = $('<div/>', {
      id: 'content',
      css: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: '3px',
        padding: '3px',
        overflow: 'auto'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', '../../dep/wysihtml5/css/wysihtml5.css');
    var style3 = style.clone().attr('href', '../../ui/modal/verifyPopup.css');
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(style)
                                     .append(style2)
                                     .append(style3);
      sandbox.contents().find('body').append(header)
                                     .append(content);
    });
    $('.modal-body').append(sandbox);
  }

  function showMessageArea() {
    $('#verifymail').fadeIn();
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well span5'}).appendTo(errorbox);
    $('.modal-body').append(errorbox);
  }

  function showError(msg) {
    showMessageArea();
    // hide sandbox
    $('.modal-body iframe').hide();
    $('#errorbox').show();
    $('#errorwell').showAlert('Error', msg, 'error');
    $('#copyBtn').prop('disabled', true);
  }

  function messageListener(msg) {
    // remove spinner for all events
    $('body').removeClass('spinner');
    switch (msg.event) {
      case 'verified-message':
        //console.log('popup decrypted message: ', msg.message);
        showMessageArea();
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        message = $.parseHTML(message);
        var node = sandbox.contents().find('#content');
        node.append(message);
        if (msg.verified && msg.verified.valid) {
          //key known and verified
          node.addClass('verified');
          //key found
          header.append(
            'Message signed by',
            ' ',
            $('<span/>', {
              id: 'userid'
            }).text(msg.userid),
            ' ',
            '(Key ID:',
            ' ',
            keyidNode,
            ')'
          );
        } else {
          //key unknown
          node.addClass('unknown');
          header.append(
              'Message was signed with unknown key',
              ' ',
              keyidNode
          );
        }
        break;
      case 'error-message':
        showError(msg.error);
        break;
      default:
        console.log('unknown event', msg.event);
    }
  }

  $(document).ready(init);

}());
