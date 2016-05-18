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

var mvelo = mvelo || null;

mvelo.Editor = function($scope, $timeout, $q) {
  this.setGlobal($scope, $timeout);
  this.registerEventListeners();
  this.initComplete();

  $scope.checkSendStatus = function() {};

  $scope.tagStyle = function(recipient) {};

  $scope.verify = function(recipient) {
    if (!recipient) {
      return;
    }

    if (recipient.email) {
      // display only email address after autocomplete
      recipient.displayId = recipient.email;
    } else {
      // set address after manual input
      recipient.email = recipient.displayId;
    }
  };

  $scope.autocomplete = function(query) {
    return $q(function(resolve) {
      resolve();

    }).then(function() {
      var cache = $scope.keys.map(function(key) {
        return {
          email: key.email,
          displayId: key.userid
        };
      });

      return cache.filter(function(i) {
        return i.displayId.toLowerCase().indexOf(query.toLowerCase()) !== -1;
      });

    }).catch(function(err) {
      console.log(err);
    });
  };
};

mvelo.Editor.prototype = Object.create(mvelo.EventHandler.prototype); // add event api

if (typeof angular !== 'undefined') { // do not use angular in unit tests
  angular.module('editor', ['ngTagsInput']).controller('EditorCtrl', mvelo.Editor);
}

(function() {

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
  var undoText = null;
  var initText = null;
  var file;
  var commonPath;
  var l10n;
  var logTextareaInput = true;
  var numUploadsInProgress = 0;
  var delayedAction = '';
  var qs;
  var $scope;
  var $timeout;

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
    'upload_quota_warning_headline'
  ], function(result) {
    l10n = result;
  });

  var maxFileUploadSize = mvelo.MAXFILEUPLOADSIZE;
  var maxFileUploadSizeChrome = mvelo.MAXFILEUPLOADSIZECHROME; // temporal fix due issue in Chrome

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
          logUserInput('security_log_add_attachment');
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
        $('#undoBtn').click(onUndo)
          .prop('disabled', true);

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
            logUserInput('security_log_add_attachment');
          });
          $('#uploadEmbeddedBtn, #addFileInput').hide();
        })
        .then(callback);
      });
    }
  }

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

  /**
   * Remember global reference of $scope for use inside closure
   */
  mvelo.Editor.prototype.setGlobal = function(scope, timeout) {
    $scope = scope;
    $timeout = timeout;
  };

  mvelo.Editor.prototype.initComplete = function() {
    if (qs.embedded) {
      $(".secureBgndSettingsBtn").on("click", function() {
        port.postMessage({event: 'open-security-settings', sender: name});
      });
    }
    port.postMessage({event: 'editor-init', sender: name});
  };

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'editor-user-input',
      sender: name,
      source: 'security_log_editor',
      type: type
    });
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
      sendPlainText(delayedAction);
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
    logUserInput('security_log_remove_attachment');
  }

  function onCancel() {
    logUserInput('security_log_dialog_cancel');
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
      logUserInput('security_log_dialog_transfer');
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
    logUserInput('security_log_dialog_sign');
    showDialog('signDialog');
  }

  function onEncrypt() {
    logUserInput('security_log_dialog_encrypt');
    sendPlainText('encrypt');
  }

  function onUndo() {
    logUserInput('security_log_dialog_undo');
    setText(undoText);
    undoText = null;
    $('#undoBtn').prop('disabled', true);
    $('#signBtn, #encryptBtn').show();
    $('#transferBtn').hide();
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
        logUserInput('security_log_textarea_input');
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
        logUserInput('security_log_textarea_click');
      } else {
        logUserInput('security_log_textarea_select');
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

  function hidePwdDialog() {
    $('body #pwdDialog').fadeOut(function() {
      $('body #pwdDialog').remove();
      $('body').find('#editorDialog').show();
    });
  }

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

  function removeDialog() {
    $('#encryptModal').modal('hide');
    $('#encryptModal iframe').remove();
  }

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

  function removeErrorModal() {
    $('#errorModal').modal('hide');
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

  function sendPlainText(action) {
    port.postMessage({
      event: 'editor-plaintext',
      sender: name,
      message: editor.val(),
      keys: getRecipientKeys(),
      attachments: mvelo.file.getFiles($('#uploadPanel')),
      action: action
    });
  }

  /**
   * Matches the recipients from the input to their public keys
   * and returns an array of keys.
   * @return {Array}   the array of public key objects
   */
  function getRecipientKeys() {
    var emails = $scope.recipients.map(function(r) { return r.email; });
    var keys = $scope.keys.filter(function(key) {
      return emails.indexOf(key.email) !== -1;
    });
    return keys;
  }

  /**
   * Remember the available public keys for later and set the
   * recipients proposal gotten from the webmail ui to the editor
   * @param {Array} options.keys         A list of all available public
   *                                     keys from the local keychain
   * @param {Array} options.recipients   recipients gather from the
   *                                     webmail ui
   */
  mvelo.Editor.prototype.setRecipients = function(options) {
    $timeout(function() { // required to refresh $scope
      $scope.recipients = options.recipients.map(function(r) {
        return {email:r.email, displayId:r.email};
      });
      $scope.keys = options.keys; // remember list of all keys
    });
  };

  mvelo.Editor.prototype.showWaitingModal = function() {
    $('#waitingModal').modal({keyboard: false}).modal('show');
  };

  mvelo.Editor.prototype.hideWaitingModal = function() {
    $('#waitingModal').modal('hide');
  };

  mvelo.Editor.prototype._onSetInitData = function(msg) {
    var data = msg.data;
    onSetText(data);
    setSignMode(data.signMsg || false, data.primary);
  };

  mvelo.Editor.prototype._onSetAttachment = function(msg) {
    setAttachment(msg.attachment);
  };

  mvelo.Editor.prototype._decryptFailed = function(msg) {
    var error = {
      title: l10n.waiting_dialog_decryption_failed,
      message: (msg.error) ? msg.error.message : l10n.waiting_dialog_decryption_failed,
      class: 'alert alert-danger'
    };
    showErrorModal(error);
  };

  mvelo.Editor.prototype._onShowPwdDialog = function(msg) {
    removeDialog();
    addPwdDialog(msg.id);
  };

  mvelo.Editor.prototype._getPlaintext = function(msg) {
    if (numUploadsInProgress !== 0) {
      delayedAction = msg.action;
    } else {
      sendPlainText(msg.action);
    }
  };

  mvelo.Editor.prototype._onErrorMessage = function(msg) {
    if (msg.error.code === 'PWD_DIALOG_CANCEL') {
      return;
    }
    showErrorModal(msg.error);
  };

  mvelo.Editor.prototype.registerEventListeners = function() {
    this.on('public-key-userids', this.setRecipients);
    this.on('set-text', onSetText);
    this.on('set-init-data', this._onSetInitData);
    this.on('set-attachment', this._onSetAttachment);
    this.on('decrypt-in-progress', this.showWaitingModal);
    this.on('encrypt-in-progress', this.showWaitingModal);
    this.on('decrypt-end', this.hideWaitingModal);
    this.on('encrypt-end', this.hideWaitingModal);
    this.on('encrypt-failed', this.hideWaitingModal);
    this.on('decrypt-failed', this._decryptFailed);
    this.on('show-pwd-dialog', this._onShowPwdDialog);
    this.on('hide-pwd-dialog', hidePwdDialog);
    this.on('sign-dialog-cancel', removeDialog);
    this.on('get-plaintext', this._getPlaintext);
    this.on('error-message', this._onErrorMessage);

    port.onMessage.addListener(this.handlePortMessage.bind(this));
  };

  if (typeof angular !== 'undefined') { angular.element(document).ready(init); }

}());
