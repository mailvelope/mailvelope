/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2016 Mailvelope GmbH
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
 * @fileOverview This file implements the interface for encrypting and
 * signing user data in an sandboxed environment that is secured from
 * the webmail interface.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import mvelo from '../../mvelo';
import EditorFooter from './components/EditorFooter';
import EditorModalFooter from './components/EditorModalFooter';
import {RecipientInput} from './components/RecipientInput';
import * as l10n from '../../lib/l10n';
import * as fileLib from '../../lib/file';

'use strict';


// component id
export var id;
// component name
export var name;
// plain or rich text
var editor_type = mvelo.PLAIN_TEXT; // only plain
// port to background script
var port;
// indicator if editor runs in container or popup
export var embedded;
// editor element
var editor;
// blur warning
var blurWarn;
// timeoutID for period in which blur events are monitored
var blurWarnPeriod = null;
// timeoutID for period in which blur events are non-critical
var blurValid = null;
// buffer for initial text
var initText = null;
// platform specific path to extension
var basePath;
// flag to control time slice for input logging
var logTextareaInput = true;
// flag to monitor upload-in-progress status
var numUploadsInProgress = 0;
// buffer for UI action
var delayedAction = '';
// initial bottom position of body
let modalBodyBottomPosition = 0;
// attachment max file size
var maxFileUploadSize = mvelo.MAXFILEUPLOADSIZE;
var maxFileUploadSizeChrome = mvelo.MAXFILEUPLOADSIZECHROME; // temporal fix due issue in Chrome

// properties used to render the footer component
let footerProps = {
  onClickUpload: () => logUserInput('security_log_add_attachment'),
  onChangeFileInput: onAddAttachment,
  onClickFileEncryption: () => port.emit('open-app', {fragment: 'file_encrypting'})
};

// properties used to render the modal footer component
let modalFooterProps = {
  expanded: false,
  signMsg: false,
  signKey: '',
  onCancel: cancel,
  onSignOnly: sign,
  onEncrypt: encrypt,
  onExpand: () => {
    $('.m-modal .modal-body').animate({bottom: '172px'}, () => {
      renderModalFooter({expanded: true});
    });
  },
  onCollapse: () => {
    $('.m-modal .modal-body').animate({bottom: modalBodyBottomPosition});
    renderModalFooter({expanded: false});
  },
  onChangeSignMsg: value => {
    renderFooter({signMsg: value});
    renderModalFooter({signMsg: value});
  },
  onChangeSignKey: value => renderModalFooter({signKey: value}),
  onClickSignSetting: () => port.emit('open-app', {fragment: 'general'})
};

// properties used to render the recipient input component
let recipientInputProps = {
  keys: [],
  recipients: [],
  onChangeEncryptStatus: status => renderModalFooter(status),
  onLookupKeyOnServer: recipient => port.emit('keyserver-lookup', {recipient})
}

// register language strings
l10n.register([
  'editor_remove_upload',
  'waiting_dialog_decryption_failed',
  'upload_quota_exceeded_warning',
  'editor_error_header',
  'editor_error_content',
  'waiting_dialog_prepare_email',
  'upload_quota_warning_headline',
  'editor_key_not_found',
  'editor_key_not_found_msg'
]);

$(document).ready(init);

/**
 * Inialized the editor by parsing query string parameters
 * and loading templates into the DOM.
 */
function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  checkEnvironment();
  port = new mvelo.EventHandler(mvelo.extension.connect({name: name}), name);
  registerEventListeners();
  Promise.all([
    loadTemplates(),
    l10n.mapToLocal()
  ])
  .then(renderReactComponents)
  .then(templatesLoaded);
  if (mvelo.crx) {
    basePath = '../../';
  } else if (mvelo.ffa) {
    basePath = mvelo.extension._dataPath;
  }
}

/**
 * Reads the URL query string to get environment context
 */
export function checkEnvironment() {
  let qs = $.parseQuerystring();
  embedded = Boolean(qs.embedded);
  id = qs.id;
  name = 'editor-' + id;
  if (qs.quota && parseInt(qs.quota) < maxFileUploadSize) {
    maxFileUploadSize = parseInt(qs.quota);
  }
  if (mvelo.crx && maxFileUploadSize > maxFileUploadSizeChrome) {
    maxFileUploadSize = maxFileUploadSizeChrome;
  }
}

/**
 * Register the event handlers
 */
function registerEventListeners() {
  port.on('set-text', onSetText);
  port.on('set-init-data', onSetInitData);
  port.on('set-attachment', onSetAttachment);
  port.on('decrypt-in-progress', showWaitingModal);
  port.on('encrypt-in-progress', showWaitingModal);
  port.on('decrypt-end', hideWaitingModal);
  port.on('encrypt-end', hideWaitingModal);
  port.on('encrypt-failed', hideWaitingModal);
  port.on('decrypt-failed', decryptFailed);
  port.on('show-pwd-dialog', onShowPwdDialog);
  port.on('hide-pwd-dialog', hidePwdDialog);
  port.on('get-plaintext', getPlaintext);
  port.on('error-message', onErrorMessage);
  /**
   * Remember the available public keys for later and set the recipients proposal gotten from the webmail ui to the editor
   * @param {Array} options.keys         A list of all available public keys from the local keychain
   * @param {Array} options.recipients   recipients gather from the webmail ui
   * @param {boolean} options.tofu       If the editor should to TOFU key lookup
   */
  port.on('public-key-userids', ({tofu, keys, recipients}) => renderRecipientInput({tofu, keys, recipients}));
  /**
   * Event that is triggered when the key server responded
   * @param {Array} options.keys   A list of all available public keys from the local keychain
   */
  port.on('keyserver-response', ({keys}) => renderRecipientInput({keys}));
}

/**
 * Load templates into the DOM.
 */
function loadTemplates() {
  var $body = $('body');
  if (embedded) {
    $body.addClass("secureBackground");
    return Promise.all([
      mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/editor-body.html')),
      mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/waiting-modal.html')),
      mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/error-modal.html'))
    ]);
  } else {
    return mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/editor-popup.html')).then(function() {
      $('.modal-body').addClass('secureBackground');
      return Promise.all([
        mvelo.appendTpl($('#editorDialog .modal-body'), mvelo.extension.getURL('components/editor/tpl/editor-body.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/encrypt-modal.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/waiting-modal.html')),
        mvelo.appendTpl($body, mvelo.extension.getURL('components/editor/tpl/error-modal.html'))
      ]);
    });
  }
}

function renderReactComponents() {
  renderFooter({embedded});
  if (!embedded) {
    renderRecipientInput();
    renderModalFooter();
  }
  return Promise.resolve();
}

function renderFooter(props = {}) {
  Object.assign(footerProps, props);
  ReactDOM.render(React.createElement(EditorFooter, footerProps), $('#footer').get(0));
}

function renderModalFooter(props = {}) {
  Object.assign(modalFooterProps, props);
  ReactDOM.render(React.createElement(EditorModalFooter, modalFooterProps), $('#editorDialog .modal-footer').get(0));
}

function renderRecipientInput(props = {}) {
  Object.assign(recipientInputProps, props);
  ReactDOM.render(React.createElement(RecipientInput, recipientInputProps), $('#editorBody #recipients').get(0));
}

/**
 * Called after templates have loaded. Now is the time to bootstrap angular.
 */
function templatesLoaded() {
  $('#waitingModal').on('hidden.bs.modal', function() {
    editor.focus()
      .prop('selectionStart', 0)
      .prop('selectionEnd', 0);
  });
  $(window).on('focus', startBlurValid);
  if (editor_type == mvelo.PLAIN_TEXT) {
    editor = createPlainText();
  } else {
    // no rich text option
  }
  // blur warning
  blurWarn = $('#blurWarn');
  // observe modals for blur warning
  $('.modal').on('show.bs.modal', startBlurValid);
  if (initText) {
    setText(initText);
    initText = null;
  }
  mvelo.l10n.localizeHTML();
  mvelo.util.showSecurityBackground(embedded);
  // keep initial bottom position of body
  modalBodyBottomPosition = $('.m-modal .modal-body').css('bottom');
  // opens the security settings if in embedded mode
  if (embedded) {
    $('.secureBgndSettingsBtn').on('click', () => port.emit('open-security-settings'));
  }
  // emit event to backend that editor has initialized
  port.emit('editor-init');
}

/**
 * Send the plaintext body to the background script for either signing or encryption.
 * @param  {String} action   Either 'sign' or 'encrypt'
 */
function sendPlainText(action) {
  port.emit('editor-plaintext', {
    message: editor.val(),
    keys: recipientInputProps.recipients.map(r => r.key || r), // some recipients don't have a key, still return address
    attachments: fileLib.getFiles($('#uploadPanel')),
    action: action,
    signMsg: modalFooterProps.signMsg,
    signKey: modalFooterProps.signKey.toLowerCase()
  });
}

/**
 * send log entry for user input
 * @param {string} type
 */
function logUserInput(type) {
  port.emit('editor-user-input', {
    source: 'security_log_editor',
    type: type
  });
}

/**
 * Is called when the user clicks the encrypt button.
 */
function encrypt() {
  logUserInput('security_log_dialog_encrypt');
  sendPlainText('encrypt');
}

/**
 * Is called when the user clicks the sign button.
 */
function sign() {
  logUserInput('security_log_dialog_sign');
  port.emit('sign-only', {
    signKeyId: modalFooterProps.signKey.toLowerCase()
  });
}

/**
 * Is called when the user clicks the cancel button.
 */
function cancel() {
  logUserInput('security_log_dialog_cancel');
  port.emit('editor-cancel');
}

function showWaitingModal() {
  $('#waitingModal').modal({keyboard: false}).modal('show');
}

function hideWaitingModal() {
  $('#waitingModal').modal('hide');
}

function onSetInitData({data}) {
  onSetText(data);
  setSignMode(data);
}

function onSetAttachment(msg) {
  setAttachment(msg.attachment);
}

function decryptFailed(msg) {
  var error = {
    title: l10n.map.waiting_dialog_decryption_failed,
    message: (msg.error) ? msg.error.message : l10n.map.waiting_dialog_decryption_failed,
    class: 'alert alert-danger'
  };
  showErrorModal(error);
}

function onShowPwdDialog(msg) {
  removeDialog();
  addPwdDialog(msg.id);
}

function hidePwdDialog() {
  $('body #pwdDialog').fadeOut(function() {
    $('body #pwdDialog').remove();
    $('body').find('#editorDialog').show();
  });
}

function removeDialog() {
  $('#encryptModal').modal('hide');
  $('#encryptModal iframe').remove();
}

function getPlaintext(msg) {
  if (numUploadsInProgress !== 0) {
    delayedAction = msg.action;
  } else {
    sendPlainText(msg.action);
  }
}

function onErrorMessage(msg) {
  if (msg.error.code === 'PWD_DIALOG_CANCEL') {
    return;
  }
  showErrorModal(msg.error);
}

/**
 * Attachments
 */

function addAttachment(file) {
  if (fileLib.isOversize(file)) {
    throw new Error('File is too big');
  }

  fileLib.readUploadFile(file, afterLoadEnd)
    .then(function(response) {
      var $fileElement = fileLib.createFileElement(response, {
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

  var currentAttachmentsSize = fileLib.getFileSize($('#uploadPanel')) + fileSizeAll;
  if (currentAttachmentsSize > maxFileUploadSize) {
    var error = {
      title: l10n.map.upload_quota_warning_headline,
      message: l10n.map.upload_quota_exceeded_warning + " " + Math.floor(maxFileUploadSize / (1024 * 1024)) + "MB."
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
  var style = $('<link/>', { rel: 'stylesheet', href: basePath + 'dep/bootstrap/css/bootstrap.css' });
  var style2 = $('<link/>', { rel: 'stylesheet', href: basePath + 'mvelo.css' });
  var meta = $('<meta/>', { charset: 'UTF-8' });
  sandbox.one('load', function() {
    sandbox.contents().find('head').append(meta)
      .append(style)
      .append(style2);
    sandbox.contents().find('body').attr("style", "overflow: hidden; margin: 0")
      .append(text);
  });
  $('#plainText').append(sandbox);
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

function setPlainText(text) {
  editor.focus()
    .val(text)
    .prop('selectionStart', 0)
    .prop('selectionEnd', 0);
}

function setText(text) {
  if (editor_type == mvelo.PLAIN_TEXT) {
    setPlainText(text);
  } else {
    // no rich text option
  }
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
    src: '../enter-password/pwdDialog.html?id=' + id,
    frameBorder: 0
  });
  $('body').find('#editorDialog').fadeOut(function() {
    $('body').append(pwd);
  });
}

/**
 * @param {Object} error
 * @param {String} [error.title]
 * @param {String} error.message
 * @param {String} [error.class]
 */
function showErrorModal(error) {
  var title = error.title || l10n.map.editor_error_header;
  var content = error.message;
  var $errorModal = $('#errorModal');

  if (content) {
    content = $('<div/>').addClass(error.class || 'alert alert-danger').text(content);
  }

  $('.modal-body', $errorModal).empty().append(content);
  $('.modal-title', $errorModal).empty().append(title);
  $errorModal.modal('show').on('hidden.bs.modal', function() {
    $('#waitingModal').modal('hide');
  });
  hidePwdDialog();
}

function setSignMode({signMsg, primary, privKeys}) {
  signMsg = Boolean(signMsg);
  // update footer
  renderFooter({signMsg, primaryKey: Boolean(primary)});
  // only render in non-embedded mode
  if (!footerProps.embedded) {
    // update modal footer
    renderModalFooter({signMsg, signKey: primary, privKeys});
  }
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
