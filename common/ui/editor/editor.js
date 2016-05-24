/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2015 Mailvelope GmbH
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

/**
 * Parts of the editor are based on Hoodiecrow (MIT License)
 * Copyright (c) 2014 Whiteout Networks GmbH.
 * See https://github.com/tanx/hoodiecrow/blob/master/LICENSE
 */

/**
 * @fileOverview This file implements the interface for encrypting and
 * signing user data in an sandboxed environment that is secured from
 * the webmail interface.
 */

'use strict';

angular.module('editor', ['ngTagsInput']); // load editor module dependencies
angular.module('editor').controller('EditorCtrl', EditorCtrl); // attach ctrl to editor module

/**
 * Angular controller for the editor UI.
 */
function EditorCtrl($timeout) {
  this._timeout = $timeout;

  this.setGlobal(this); // share 'this' as '_self' in legacy closure code
  this.checkEnvironment(); // get environment vars
  this.registerEventListeners(); // listen to incoming events
  this.initComplete(); // emit event to backend that editor has initialized
}

EditorCtrl.prototype = Object.create(mvelo.EventHandler.prototype); // add event api

/**
 * Reads the urls query string to get environment context
 */
EditorCtrl.prototype.checkEnvironment = function() {
  var qs = $.parseQuerystring();
  this.embedded = qs.embedded;
  this._id = qs.id;
  this._name = 'editor-' + this._id;
};

/**
 * Verifies a recipient after input, gets their key, colors the
 * input tag accordingly and checks if encryption is possible.
 * @param  {Object} recipient   The recipient object
 */
EditorCtrl.prototype.verify = function(recipient) {
  if (!recipient) {
    return;
  }
  if (recipient.email) { // display only address from autocomplete
    recipient.displayId = recipient.email;
  } else { // set address after manual input
    recipient.email = recipient.displayId;
  }
  this.getKey(recipient);
  this.colorTag(recipient);
  this.checkEncryptStatus();
};

/**
 * Finds the recipient's corresponding public key and sets it
 * on the 'key' attribute on the recipient object.
 * @param  {Object} recipient   The recipient object
 * @return {Object}             The key object (undefined if none found)
 */
EditorCtrl.prototype.getKey = function(recipient) {
  recipient.key = (this.keys || []).find(function(key) {
    if (key.email && recipient.email) {
      return key.email.toLowerCase() === recipient.email.toLowerCase();
    }
  });
  return recipient.key;
};

/**
 * Uses jQuery to color the recipient's input tag depending on
 * whether they have a key or not.
 * @param  {Object} recipient   The recipient object
 */
EditorCtrl.prototype.colorTag = function(recipient) {
  this._timeout(function() { // wait for html tag to appear
    $('tags-input li.tag-item').each(function() {
      if ($(this).text().indexOf(recipient.email) === -1) {
        return;
      }
      if (recipient.key) {
        $(this).addClass('tag-success');
      } else {
        $(this).addClass('tag-danger');
      }
    });
  });
};

/**
 * Checks if all recipients have a public key and prevents encryption
 * if one of them does not have a key.
 */
EditorCtrl.prototype.checkEncryptStatus = function() {
  this.noEncrypt = (this.recipients || []).some(function(r) { return !r.key; });
};

/**
 * Queries the local cache of key objects to find a matching user ID
 * @param  {String} query   The autocomplete query
 * @return {Array}          A list of filtered items that match the query
 */
EditorCtrl.prototype.autocomplete = function(query) {
  var cache = (this.keys || []).map(function(key) {
    return {
      email: key.email,
      displayId: key.userid || ''
    };
  });
  return cache.filter(function(i) {
    return i.displayId.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  });
};


//
// Evant handling from background script
//


/**
 * Register the event handlers for the editor.
 */
EditorCtrl.prototype.registerEventListeners = function() {
  this.on('public-key-userids', this._setRecipients);
  this.on('set-text', this._onSetText);
  this.on('set-init-data', this._onSetInitData);
  this.on('set-attachment', this._onSetAttachment);
  this.on('decrypt-in-progress', this._showWaitingModal);
  this.on('encrypt-in-progress', this._showWaitingModal);
  this.on('decrypt-end', this._hideWaitingModal);
  this.on('encrypt-end', this._hideWaitingModal);
  this.on('encrypt-failed', this._hideWaitingModal);
  this.on('decrypt-failed', this._decryptFailed);
  this.on('show-pwd-dialog', this._onShowPwdDialog);
  this.on('hide-pwd-dialog', this._hidePwdDialog);
  this.on('sign-dialog-cancel', this._removeDialog);
  this.on('get-plaintext', this._getPlaintext);
  this.on('error-message', this._onErrorMessage);

  this._port.onMessage.addListener(this.handlePortMessage.bind(this));
};

/**
 * Remember the available public keys for later and set the
 * recipients proposal gotten from the webmail ui to the editor
 * @param {Array} options.keys         A list of all available public
 *                                     keys from the local keychain
 * @param {Array} options.recipients   recipients gather from the
 *                                     webmail ui
 */
EditorCtrl.prototype._setRecipients = function(options) {
  this._timeout(function() { // trigger $scope.$digest() after async call
    this.keys = options.keys;
    this.recipients = options.recipients;
    this.recipients.forEach(this.verify.bind(this));
  }.bind(this));
};

/**
 * Matches the recipients from the input to their public keys
 * and returns an array of keys. If a recipient does not have a key
 * still return their address.
 * @return {Array}   the array of public key objects
 */
EditorCtrl.prototype.getRecipientKeys = function() {
  return this.recipients.map(function(r) {
    return r.key || r; // some recipients don't have a key, still return address
  });
};

/**
 * Emit an event to the background script that the editor is finished initializing.
 * Called when the angular controller is initialized (after templates have loaded)
 */
EditorCtrl.prototype.initComplete = function() {
  this.emit('editor-init', {sender: this._name});
};

/**
 * Opens the security settings if in embedded mode
 */
EditorCtrl.prototype.openSecuritySettings = function() {
  if (this.embedded) {
    this.emit('open-security-settings', {sender: this._name});
  }
};

/**
 * Send the plaintext body to the background script for either signing or
 * encryption.
 * @param  {String} action   Either 'sign' or 'encrypt'
 */
EditorCtrl.prototype.sendPlainText = function(action) {
  this.emit('editor-plaintext', {
    sender: this._name,
    message: this.getEditorText(),
    keys: this.getRecipientKeys(),
    attachments: this.getAttachments(),
    action: action
  });
};

/**
 * send log entry for the extension
 * @param {string} type
 */
EditorCtrl.prototype.logUserInput = function(type) {
  this.emit('editor-user-input', {
    sender: this._name,
    source: 'security_log_editor',
    type: type
  });
};


//
// Legacy code is contained in a closure and needs to be refactored to use angular
//


(function() {

  if (!angular.mock) { // do not init in unit tests
    angular.element(document).ready(init); // do manual angular bootstraping after init
  }

  EditorCtrl.prototype.getEditorText = function() {
    return editor.val();
  };

  EditorCtrl.prototype.getAttachments = function() {
    return mvelo.file.getFiles($('#uploadPanel'));
  };

  EditorCtrl.prototype._onSetText = function(msg) {
    onSetText(msg);
  };

  EditorCtrl.prototype._showWaitingModal = function() {
    $('#waitingModal').modal({keyboard: false}).modal('show');
  };

  EditorCtrl.prototype._hideWaitingModal = function() {
    $('#waitingModal').modal('hide');
  };

  EditorCtrl.prototype._onSetInitData = function(msg) {
    var data = msg.data;
    onSetText(data);
    setSignMode(data.signMsg || false, data.primary);
  };

  EditorCtrl.prototype._onSetAttachment = function(msg) {
    setAttachment(msg.attachment);
  };

  EditorCtrl.prototype._decryptFailed = function(msg) {
    var error = {
      title: l10n.waiting_dialog_decryption_failed,
      message: (msg.error) ? msg.error.message : l10n.waiting_dialog_decryption_failed,
      class: 'alert alert-danger'
    };
    showErrorModal(error);
  };

  EditorCtrl.prototype._onShowPwdDialog = function(msg) {
    this._removeDialog();
    addPwdDialog(msg.id);
  };

  EditorCtrl.prototype._getPlaintext = function(msg) {
    if (numUploadsInProgress !== 0) {
      delayedAction = msg.action;
    } else {
      _self.sendPlainText(msg.action);
    }
  };

  EditorCtrl.prototype._onErrorMessage = function(msg) {
    if (msg.error.code === 'PWD_DIALOG_CANCEL') {
      return;
    }
    showErrorModal(msg.error);
  };

  /**
   * Remember global reference of $scope for use inside closure
   */
  EditorCtrl.prototype.setGlobal = function(global) {
    _self = global;
    _self._port = port;
  };

  var id;
  var name;
  // plain or rich text
  var editor_type;
  var port;
  // editor element
  var editor;
  // content of editor modified
  var isDirty = false;
  // blur warning
  var blurWarn;
  // timeoutID for period in which blur events are monitored
  var blurWarnPeriod = null;
  // timeoutID for period in which blur events are non-critical
  var blurValid = null;
  var initText = null;
  var file;
  var commonPath;
  var l10n;
  var logTextareaInput = true;
  var numUploadsInProgress = 0;
  var delayedAction = '';
  var qs;
  var _self;

  // Get language strings from JSON
  mvelo.l10n.getMessages([
    'editor_remove_upload',
    'waiting_dialog_decryption_failed',
    'upload_quota_exceeded_warning',
    'editor_sign_caption_short',
    'editor_sign_caption_long',
    'editor_no_sign_caption_short',
    'editor_no_sign_caption_long',
    'editor_error_header',
    'editor_error_content',
    'waiting_dialog_prepare_email',
    'upload_quota_warning_headline',
    'editor_key_not_found',
    'editor_key_not_found_msg'
  ], function(result) {
    l10n = result;
  });

  var maxFileUploadSize = mvelo.MAXFILEUPLOADSIZE;
  var maxFileUploadSizeChrome = mvelo.MAXFILEUPLOADSIZECHROME; // temporal fix due issue in Chrome

  /**
   * Inialized the editor by parsing query string parameters
   * and loading templates into the DOM.
   */
  function init() {
    if (document.body.dataset.mvelo) {
      return;
    }
    document.body.dataset.mvelo = true;
    qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'editor-' + id;
    if (qs.quota && parseInt(qs.quota) < maxFileUploadSize) {
      maxFileUploadSize = parseInt(qs.quota);
    }
    if (mvelo.crx && maxFileUploadSize > maxFileUploadSizeChrome) {
      maxFileUploadSize = maxFileUploadSizeChrome;
    }
    // plain text only
    editor_type = mvelo.PLAIN_TEXT; //qs.editor_type;
    port = mvelo.extension.connect({name: name});
    loadTemplates(qs.embedded, templatesLoaded);
    if (mvelo.crx) {
      commonPath = '../..';
    } else if (mvelo.ffa) {
      commonPath = mvelo.extension._dataPath + 'common';
    }
  }

  /**
   * Load templates into the DOM.
   */
  function loadTemplates(embedded, callback) {
    var $body = $('body');
    if (embedded) {
      $body.addClass("secureBackground");

      Promise.all([
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/waiting-modal.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/error-modal.html'))
      ])
      .then(function() {
        $('#waitingModal').on('hidden.bs.modal', function(e) {
          editor.focus()
            .prop('selectionStart', 0)
            .prop('selectionEnd', 0);
        });

        $('#uploadEmbeddedBtn').on("click", function() {
          $('#addFileInput').click();
          _self.logUserInput('security_log_add_attachment');
        });
      })
      .then(callback);

    } else {
      mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/editor-popup.html')).then(function() {
        $('.modal-body').addClass('secureBackground');
        $('#cancelBtn').click(onCancel);
        $('#transferBtn').hide().click(onTransfer);
        $('#signBtn').click(onSign);
        $('#encryptBtn').click(onEncrypt);

        Promise.all([
          mvelo.appendTpl($('#editorDialog .modal-body'), mvelo.extension.getURL('common/ui/editor/tpl/editor-body.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/encrypt-modal.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/error-modal.html')),
          mvelo.appendTpl($body, mvelo.extension.getURL('common/ui/editor/tpl/transfer-warn.html')).then(function() {
            // transfer warning modal
            $('#transferWarn .btn-primary').click(transfer);
            $('#transferWarn').hide();
            return Promise.resolve();
          })
        ])
        .then(function() {
          $('#uploadBtn').on("click", function() {
            $('#addFileInput').click();
            _self.logUserInput('security_log_add_attachment');
          });
          $('#uploadEmbeddedBtn, #addFileInput').hide();
        })
        .then(callback);
      });
    }
  }

  /**
   * Called after templates have loaded. Now is the time to bootstrap angular.
   */
  function templatesLoaded() {
    $(window).on('focus', startBlurValid);
    if (editor_type == mvelo.PLAIN_TEXT) {
      editor = createPlainText();
    } else {
      createRichText(function(ed) {
        editor = ed;
      });
    }
    // blur warning
    blurWarn = $('#blurWarn');
    // observe modals for blur warning
    $('.modal').on('show.bs.modal', startBlurValid);
    if (initText) {
      setText(initText);
      initText = null;
    }
    $("#addFileInput").on("change", onAddAttachment);
    $('#uploadBtn').hide(); // Disable Uploading Attachment
    mvelo.l10n.localizeHTML();
    mvelo.util.showSecurityBackground(qs.embedded);

    // bootstrap angular
    angular.bootstrap(document, ['editor']);
  }

  function addAttachment(file) {
    onChange(); // setting the message as dirty

    if (mvelo.file.isOversize(file)) {
      throw new Error('File is too big');
    }

    mvelo.file.readUploadFile(file, afterLoadEnd)
      .then(function(response) {
        var $fileElement = mvelo.file.createFileElement(response, {
          removeButton: true,
          onRemove: onRemoveAttachment
        });
        var $uploadPanel = $('#uploadPanel');
        var uploadPanelHeight = $uploadPanel[0].scrollHeight;
        $uploadPanel
          .append($fileElement)
          .scrollTop(uploadPanelHeight); //Append attachment element and scroll to bottom of #uploadPanel to show current uploads

      })
      .catch(function(error) {
        console.log(error);
      });
  }

  function afterLoadEnd() {
    numUploadsInProgress--;
    if (numUploadsInProgress === 0 && delayedAction) {
      _self.sendPlainText(delayedAction);
      delayedAction = '';
    }
  }

  function setAttachment(attachment) {
    var buffer = mvelo.util.str2ab(attachment.content);
    var blob = new Blob([buffer], {type: attachment.mimeType});
    var file = new File([blob], attachment.filename, {type: attachment.mimeType});
    numUploadsInProgress++;
    addAttachment(file);
  }

  function onAddAttachment(evt) {
    var files = evt.target.files;
    var numFiles = files.length;

    var i;
    var fileSizeAll = 0;
    for (i = 0; i < numFiles; i++) {
      fileSizeAll += parseInt(files[i].size);
    }

    var currentAttachmentsSize = mvelo.file.getFileSize($('#uploadPanel')) + fileSizeAll;
    if (currentAttachmentsSize > maxFileUploadSize) {
      var error = {
        title: l10n.upload_quota_warning_headline,
        message: l10n.upload_quota_exceeded_warning + " " + Math.floor(maxFileUploadSize / (1024 * 1024)) + "MB."
      };

      showErrorModal(error);
      return;
    }

    for (i = 0; i < files.length; i++) {
      numUploadsInProgress++;
      addAttachment(files[i]);
    }
  }

  function onRemoveAttachment() {
    _self.logUserInput('security_log_remove_attachment');
  }

  function onCancel() {
    _self.logUserInput('security_log_dialog_cancel');
    port.postMessage({
      event: 'editor-cancel',
      sender: name
    });
    return false;
  }

  function onTransfer() {
    if (isDirty) {
      $('#transferWarn').modal('show');
    } else {
      _self.logUserInput('security_log_dialog_transfer');
      transfer();
    }
  }

  function transfer() {
    // wysihtml5 <body> is automatically copied to the hidden <textarea>
    var armored = editor.val();
    port.postMessage({
      event: 'editor-transfer-output',
      data: armored,
      sender: name
    });
    return true;
  }

  function onSign() {
    _self.logUserInput('security_log_dialog_sign');
    showDialog('signDialog');
  }

  function onEncrypt() {
    _self.logUserInput('security_log_dialog_encrypt');
    _self.sendPlainText('encrypt');
  }

  function createPlainText() {
    var sandbox = $('<iframe/>', {
      sandbox: 'allow-same-origin allow-scripts',
      frameBorder: 0,
      css: {
        'overflow-y': 'hidden'
      }
    });
    var text = $('<textarea/>', {
      id: 'content',
      class: 'form-control',
      rows: 12,
      css: {
        'width':         '100%',
        'height':        '100%',
        'margin-bottom': '0',
        'color':         'black',
        'resize':        'none'
      }
    });
    var style = $('<link/>', { rel: 'stylesheet', href: commonPath + '/dep/bootstrap/css/bootstrap.css' });
    var style2 = $('<link/>', { rel: 'stylesheet', href: commonPath + '/ui/mvelo.css' });
    var meta = $('<meta/>', { charset: 'UTF-8' });
    sandbox.one('load', function() {
      sandbox.contents().find('head').append(meta)
        .append(style)
        .append(style2);
      sandbox.contents().find('body').attr("style", "overflow: hidden; margin: 0")
        .append(text);
    });
    $('#plainText').append(sandbox);
    text.on('change', onChange);
    text.on('input', function() {
      startBlurWarnInterval();
      if (logTextareaInput) {
        _self.logUserInput('security_log_textarea_input');
        // limit textarea log to 1 event per second
        logTextareaInput = false;
        window.setTimeout(function() {
          logTextareaInput = true;
        }, 1000);
      }
    });
    text.on('blur', onBlur);
    text.on('mouseup', function() {
      var textElement = text.get(0);
      if (textElement.selectionStart === textElement.selectionEnd) {
        _self.logUserInput('security_log_textarea_click');
      } else {
        _self.logUserInput('security_log_textarea_select');
      }
    });
    return text;
  }

  function createRichText(callback) {
    /*
     $('#rte-box').show();
     $('#richText').wysihtml5('deepExtend', {
     toolbar_element: 'rte-toolbar',
     stylesheets: ['../../dep/wysihtml5/css/wysiwyg-color.css'],
     color: true,
     parserRules: wysihtml5ParserRules,
     events: {
     change: onChange,
     blur: onBlur,
     load: function() {
     // if user clicks in non-editable area of text editor then next blur event is not considered as relevant
     $('iframe.wysihtml5-sandbox').contents().find('html').on('mousedown', startBlurValid);
     // each input event restarts the blur warning interval
     $('iframe.wysihtml5-sandbox').contents().find('body').on('input', startBlurWarnInterval);
     callback($('#richText'));
     }
     }
     });
     */
  }

  function setRichText(text, type) {
    if (type === 'text') {
      text = '<pre>' + text + '</pre>';
    }
    editor.data("wysihtml5").editor.setValue(text, true);
    isDirty = false;
  }

  function setPlainText(text) {
    editor.focus()
      .val(text)
      .prop('selectionStart', 0)
      .prop('selectionEnd', 0);
    isDirty = false;
  }

  function setText(text, type) {
    if (editor_type == mvelo.PLAIN_TEXT) {
      setPlainText(text);
    } else {
      setRichText(text, type);
    }
  }

  function onChange() {
    // editor content modified
    isDirty = true;
  }

  function onBlur() {
    /*
     blur warning displayed if blur occurs:
     - inside blur warning period (2s after input)
     - not within 40ms after mousedown event (RTE)
     - not within 40ms before focus event (window, modal)
     */
    if (blurWarnPeriod && !blurValid) {
      window.setTimeout(function() {
        showBlurWarning();
      }, 40);
    }
    return true;
  }

  function showBlurWarning() {
    if (!blurValid) {
      // fade in 600ms, wait 200ms, fade out 600ms
      blurWarn.removeClass('hide')
        .stop(true)
        .animate({opacity: 1}, 'slow', 'swing', function() {
          setTimeout(function() {
            blurWarn.animate({opacity: 0}, 'slow', 'swing', function() {
              blurWarn.addClass('hide');
            });
          }, 200);
        });
    }
  }

  function startBlurWarnInterval() {
    if (blurWarnPeriod) {
      // clear timeout
      window.clearTimeout(blurWarnPeriod);
    }
    // restart
    blurWarnPeriod = window.setTimeout(function() {
      // end
      blurWarnPeriod = null;
    }, 2000);
    return true;
  }

  function startBlurValid() {
    if (blurValid) {
      // clear timeout
      window.clearTimeout(blurValid);
    }
    // restart
    blurValid = window.setTimeout(function() {
      // end
      blurValid = null;
    }, 40);
    return true;
  }

  function addPwdDialog(id) {
    var pwd = $('<iframe/>', {
      id: 'pwdDialog',
      src: '../modal/pwdDialog.html?id=' + id,
      frameBorder: 0
    });
    $('body').find('#editorDialog').fadeOut(function() {
      $('body').append(pwd);
    });
  }

  EditorCtrl.prototype._hidePwdDialog = function() {
    $('body #pwdDialog').fadeOut(function() {
      $('body #pwdDialog').remove();
      $('body').find('#editorDialog').show();
    });
  };

  function showDialog(type) {
    var dialog = $('<iframe/>', {
      'class': 'm-dialog',
      frameBorder: 0,
      scrolling: 'no'
    });
    var url;
    if (mvelo.crx) {
      url = mvelo.extension.getURL('common/ui/inline/dialogs/' + type + '.html?id=' + id);
    } else if (mvelo.ffa) {
      url = 'about:blank?mvelo=' + type + '&id=' + id;
    }
    dialog.attr('src', url);

    $('.modal-body', $('#encryptModal')).empty().append(dialog);
    $('#encryptModal').modal('show');
  }

  EditorCtrl.prototype._removeDialog = function() {
    $('#encryptModal').modal('hide');
    $('#encryptModal iframe').remove();
  };

  /**
   * @param {Object} error
   * @param {String} [error.title]
   * @param {String} error.message
   * @param {String} [error.class]
   */
  function showErrorModal(error) {
    var title = error.title || l10n.editor_error_header;
    var content = error.message;
    var $errorModal = $('#errorModal');

    if (error.class && typeof error.class == 'string') {
      content = $('<div/>').addClass(error.class).html(content);
    }

    $('.modal-body', $errorModal).empty().append(content);
    $('.modal-title', $errorModal).empty().append(title);
    $errorModal.modal('show').on('hidden.bs.modal', function() {
      $('#waitingModal').modal('hide');
    });
  }

  function setSignMode(signMsg, primaryKey) {
    var short, long;

    if (!signMsg) {
      $('#editor_digital_signature').hide();
      return;
    }

    if (primaryKey) {
      short = l10n.editor_sign_caption_short;
      long = l10n.editor_sign_caption_long;
    } else {
      short = l10n.editor_no_primary_key_caption_short;
      long = l10n.editor_no_primary_key_caption_long;
    }
    $('#editor_digital_signature')
      .html(short)
      .attr('title', long)
      .tooltip();
  }

  function onSetText(options) {
    if (!options.text) {
      return;
    }
    if (editor) {
      setText(options.text);
    } else {
      initText = options.text;
    }
  }

}());
