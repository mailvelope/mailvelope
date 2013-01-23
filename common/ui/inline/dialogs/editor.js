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
  // shares ID with EncryptFrame
  var id;
  // id of encrypt frame that triggered this dialog
  var parentID;
  var eFrame;
  var port;
  var editor

  function init() {
    var qs = jQuery.parseQuerystring();
    parentID = qs['parent'];
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    editor = createEditor();
    eFrame = new EncryptFrame(constant.EDITOR_WEBMAIL);
    eFrame.attachTo(editor, false);
    id = 'editor-' + eFrame.getID();
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: id}); 
    editor.focus();
  }

  function onCancel() {
    window.close();
    return false;
  }

  function onTransfer() {
    var armored = editor.val();
    port.postMessage({
      event: 'editor-transfer-armored', 
      data: armored,
      sender: id,
      recipient: parentID
    });
    window.close();
    return true;
  }

  function createEditor() {
    var sandbox = $('#richEditor');
    var text = $('<textarea/>', {
      id: 'content',
      rows: '12',
      css: {
        width: '675px'
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../../dep/bootstrap/css/bootstrap.min.css'
    });
    var head = sandbox.contents().find('head');
    style.appendTo(head);
    style.clone().attr('href', '../framestyles.css').appendTo(head);
    var script = $('<script/>', {
      src: '../../../dep/jquery.min.js'
    });
    script.appendTo(head);
    script.clone().attr('src', '../../../dep/jquery.ext.js').appendTo(head);
    script.clone().attr('src', '../mvelo.js').appendTo(head);
    sandbox.contents().find('body').append(text);
    return text;
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        editor.val(msg.text);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
  
}());