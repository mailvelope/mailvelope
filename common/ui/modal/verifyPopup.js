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
      id: 'verifymail',
      sandbox: 'allow-same-origin',
      frameBorder: 0
    });
    var header = $('<header/>');
    var content = $('<div/>', {
      id: 'content'
    }).append(header);
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.css'
    });
    var style2 = style.clone().attr('href', '../../dep/wysihtml5/css/wysihtml5.css');
    var style3 = style.clone().attr('href', '../../ui/modal/verifyPopupSig.css');
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(style)
                                     .append(style2)
                                     .append(style3);
      sandbox.contents().find('body').append(content);
    });
    $('.modal-body').append(sandbox);
  }

  function addErrorView() {
    var errorbox = $('<div/>', {id: 'errorbox'});
    $('<div/>', {id: 'errorwell', class: 'well span5'}).appendTo(errorbox);
    $('.modal-body').append(errorbox);
  }

  function showError(msg) {
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
        // js execution is prevented by Content Security Policy directive: "script-src 'self' chrome-extension-resource:"
        var message = msg.message.replace(/\n/g, '<br>');
        var node = sandbox.contents();
        var header = node.find('header');
        msg.signers.forEach(function(signer) {
          var type, userid;
          var message = $('<span/>');
          var keyid = $('<span/>');
          keyid.text('(Key ID:' + ' ' + signer.keyid.toUpperCase() + ')');
          if (signer.userid) {
            userid = $('<strong/>');
            userid.text(signer.userid);
          }
          if (signer.userid && signer.valid) {
            type = 'success';
            message.append('Signed by', ' ', userid, ' ', keyid);
          } else if (!signer.userid) {
            type = 'warning';
            message.append('Signed with unknown key', ' ', keyid);
          } else {
            type = 'error';
            message.append('Wrong signature of', ' ', userid, ' ', keyid);
          }
          header.showAlert('', message, type, true);
        });
        message = $.parseHTML(message);
        node.find('#content').append(message);
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
