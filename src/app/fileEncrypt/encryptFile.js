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

'use strict';

import $ from 'jquery';
import mvelo from '../../mvelo';
import * as app from '../app';
import event from '../util/event';
import * as l10n from '../../lib/l10n';
import * as fileLib from '../../lib/file';

import './encrypt.css';

var numUploadsInProgress = 0;
var recipients = [];

var $encryptPanels;
var $encryptFileUploadPanel;
var $encryptFileDownloadPanel;
var $encryptPersonPanel;
var $encryptFileUpload;
var $encryptFileDownload;
var $encryptToPersonBtn;
var $encryptAddFileBtn;
var $encryptToDownloadBtn;
var $encryptDownloadAllBtn;
var $encryptFileSelection;

var $encryptKeyList;
var $encryptKeySelect;
var $encryptAddPersonBtn;
var $encryptFileDownloadError;

var isEncryptCached = false;
var isDecryptCached = false;

var $decryptPanels;
var $decryptFileUploadPanel;
var $decryptFileDownloadPanel;
var $decryptFileSelection;
var $decryptFileUpload;
var $decryptAddFileBtn;
var $decryptFileDownloadError;
var $decryptToDownloadBtn;
var $decryptDownloadAllBtn;
var $decryptFileDownload;

// Get language strings from JSON
l10n.register([
  'encrypt_upload_file_warning_too_big',
  'encrypt_upload_file_help'
]);

function init() {
  addEncryptInteractivity();
  addDecryptInteractivity();

  $('#encrypting .alert').hide();

  initRecipientsSelection();
  // update recipient selection if keyring changes
  event.on('keygrid-reload', initRecipientsSelection);
}

function initRecipientsSelection() {
  app.getAllKeyUserId()
  .then(result => {
    recipients = result;
    addRecipientsToSelect(recipients);
  });
}

/**
 *
 */
function addEncryptInteractivity() {
  $encryptFileUploadPanel = $('#encrypt_fileUploadPanel');
  $encryptPersonPanel = $('#encrypt_personPanel');
  $encryptFileDownloadPanel = $('#encrypt_fileDownloadPanel');
  $encryptPanels = $('.panel.encrypt-panel');
  $encryptFileSelection = $('#encrypt_fileSelection');
  $encryptFileDownloadError = $('#encrypt_fileDownloadError');

  var $waiting = $('.waiting', $encryptFileDownloadPanel).hide();
  mvelo.util.addLoadingAnimation($waiting);

  $encryptFileUpload = $('#encrypt_fileUpload').change(onAddFile.bind(null, $encryptFileUploadPanel));
  $encryptAddFileBtn = $('#encrypt_addFileBtn')
    .on('click', function() {
      $encryptFileUpload.click();
    });
  $encryptToPersonBtn = $('#encrypt_goToPersonBtn')
    .prop('disabled', true)
    .on('click', function() {
      switchPanel($encryptPersonPanel, $encryptPanels);
    });
  $encryptToDownloadBtn = $('#encrypt_goToDownloadBtn')
    .prop('disabled', true)
    .on('click', onEncryptFiles);
  $encryptDownloadAllBtn = $('#encrypt_downloadAllBtn')
    .prop('disabled', true)
    .on('click', function() {
      $encryptFileDownload.children().each(function() {
        this.click();
      });
    });
  $('#encrypt_backToUploadBtn')
    .on('click', function() {
      switchPanel($encryptFileUploadPanel, $encryptPanels);
    });
  $('#encrypt_backToPersonBtn')
    .on('click', function() {
      switchPanel($encryptPersonPanel, $encryptPanels);
    });
  $encryptFileDownload = $('#encrypt_fileDownload');

  var MAXFILEUPLOADSIZE = mvelo.crx ? mvelo.MAXFILEUPLOADSIZECHROME : mvelo.MAXFILEUPLOADSIZE;
  MAXFILEUPLOADSIZE = Math.ceil(MAXFILEUPLOADSIZE / 1024 / 1024);

  $encryptAddFileBtn.next()
    .text(l10n.map.encrypt_upload_file_help.replace('##', MAXFILEUPLOADSIZE));

  $encryptKeyList = $('#encrypt_keyList');
  $encryptKeySelect = $('#encrypt_keySelect');
  $encryptAddPersonBtn = $('#encrypt_addPersonBtn')
    .on('click', onAddRecipient);

  switchPanel($encryptFileUploadPanel, $encryptPanels);
}

/**
 *
 */
function addDecryptInteractivity() {
  $decryptFileUploadPanel = $('#decrypt_fileUploadPanel');
  $decryptFileDownloadPanel = $('#decrypt_fileDownloadPanel');
  $decryptPanels = $('.panel.decrypt-panel');
  $decryptFileDownloadError = $('#decrypt_fileDownloadError');
  $decryptFileSelection = $('#decrypt_fileSelection');
  $decryptFileDownload = $('#decrypt_fileDownload');

  var $waiting = $('.waiting', $decryptFileDownloadPanel).hide();
  mvelo.util.addLoadingAnimation($waiting);

  $decryptFileUpload = $('#decrypt_fileUpload').on('change', onAddFile.bind(null, $decryptFileUploadPanel));
  $decryptAddFileBtn = $('#decrypt_addFileBtn')
    .on('click', function() {
      $decryptFileUpload.click();
    });

  var MAXFILEUPLOADSIZE = mvelo.crx ? mvelo.MAXFILEUPLOADSIZECHROME : mvelo.MAXFILEUPLOADSIZE;
  MAXFILEUPLOADSIZE = Math.ceil(MAXFILEUPLOADSIZE / 1024 / 1024);

  $decryptAddFileBtn.next()
    .text(l10n.map.encrypt_upload_file_help.replace('##', MAXFILEUPLOADSIZE));

  $decryptToDownloadBtn = $('#decrypt_goToDownloadBtn')
    .prop('disabled', true)
    .on('click', onDecryptFiles);

  $decryptDownloadAllBtn = $('#decrypt_downloadAllBtn')
    .prop('disabled', true)
    .on('click', function() {
      $decryptFileDownload.children().each(function() {
        this.click();
      });
    });

  $('#decrypt_backToUploadBtn')
    .on('click', function() {
      switchPanel($decryptFileUploadPanel, $decryptPanels);
    });

  switchPanel($decryptFileUploadPanel, $decryptPanels);
}

/**
 * @param {Event} e
 */
function onDecryptFiles(e) {
  e.preventDefault();

  if (!isDecryptCached) {
    $decryptFileDownload.children().remove();
    hideError($decryptFileDownloadError);
    $('.waiting', $decryptFileDownloadPanel).show();
    var encryptedFiles = fileLib.getFiles($decryptFileUploadPanel);
    decryptFiles(encryptedFiles)
      .catch(function(error) {
        showError(error.message, $decryptFileDownloadError);
      })
      .then(function() {
        $('.waiting', $decryptFileDownloadPanel).hide();
        isDecryptCached = hasError($decryptFileDownloadError) ? false : true;
        if ($decryptFileDownload.children().length) {
          $decryptDownloadAllBtn.prop('disabled', false);
        }
      });
  }

  switchPanel($decryptFileDownloadPanel, $decryptPanels);
}

function decryptFiles(encryptedFiles) {
  var decryptProcesses = [];
  encryptedFiles.forEach(function(encryptedFile) {
    decryptProcesses.push(app.pgpModel('decryptFile', [encryptedFile])
      .then(function(file) {
        addFileToDownload({
          name: file.name,
          content: file.content,
          type: 'application/octet-stream'
        }, $decryptFileDownload);
      })
      .catch(function(error) {
        showError(error.message, $decryptFileDownloadError);
      })
    );
  });
  return Promise.all(decryptProcesses);
}

/**
 * @param {Event} e
 */
function onEncryptFiles(e) {
  e.preventDefault();

  if (!isEncryptCached) {
    $encryptFileDownload.children().remove();
    hideError($encryptFileDownloadError);
    $('.waiting', $encryptFileDownloadPanel).show();
    var plainFiles = fileLib.getFiles($encryptFileUploadPanel);
    var receipients = getSelectedRecipients();
    encryptFiles(plainFiles, receipients)
      .then(function() {
        isEncryptCached = true;
        $encryptDownloadAllBtn.prop('disabled', false);
      })
      .catch(function(error) {
        isEncryptCached = false;
        $encryptDownloadAllBtn.prop('disabled', true);
        showError(error.message, $encryptFileDownloadError);
      })
      .then(function() {
        $('.waiting', $encryptFileDownloadPanel).hide();
      });
  }
  switchPanel($encryptFileDownloadPanel, $encryptPanels);
}

function encryptFiles(plainFiles, receipients) {
  var encryptProcesses = [];
  plainFiles.forEach(function(plainFile) {
    encryptProcesses.push(app.pgpModel('encryptFile', [plainFile, receipients])
      .then(function(armored) {
        addFileToDownload({
          name: plainFile.name + '.asc',
          content: armored,
          type: 'application/octet-stream'
        }, $encryptFileDownload, {secureIcon: true});
      })
    );
  });
  return Promise.all(encryptProcesses);
}

function getSelectedRecipients() {
  var result = [];
  $encryptKeyList.find('.recipientButton').each(function() {
    result.push(recipients[parseInt($(this).data('index'))]);
  });
  return result;
}

/**
 * Add recipient to the selection field
 * @param {Event} e
 */
function onAddRecipient(e) {
  e.preventDefault();
  var $selected = $('option:selected', $encryptKeySelect);
  var index = parseInt($selected.val());
  var recipient = $.extend(recipients[index], {
    index: index
  });

  $encryptKeyList.append(getRecipientButton(recipient));

  toggleSelectionInKeyList(index, 'ADD');
  if ($encryptKeyList.has('.recipientButton').length) {
    $encryptToDownloadBtn.prop('disabled', false);
  }
  isEncryptCached = false;
}

/**
 * Remove recipient from the selection field
 * @param {Event} e
 */
function onRemoveRecipient(e) {
  e.preventDefault();

  var $this = $(this);
  toggleSelectionInKeyList($this.data('index'), 'REMOVE');

  $this.parent().remove();
  if (!$encryptKeyList.has('.recipientButton').length) {
    $encryptToDownloadBtn.prop('disabled', true);
  }
  isEncryptCached = false;
}

/**
 * @param {jQuery} $filePanel
 * @param {Event} evt
 */
function onAddFile($filePanel, evt) {
  var files = evt.target.files;

  var $fileUploadError = $filePanel.find('.fileUploadError');

  hideError($fileUploadError);

  for (var i = 0; i < files.length; i++) {
    var file = files[i];

    if (fileLib.isOversize(file)) {
      showError(l10n.map.encrypt_upload_file_warning_too_big, $fileUploadError, true);
      continue;
    }

    numUploadsInProgress++;
    fileLib.readUploadFile(file, afterLoadEnd.bind(null, $filePanel))
      .then(function(response) {
        var $fileElement = fileLib.createFileElement(response, {
          removeButton: true,
          onRemove: onRemoveFile,
          secureIcon: $filePanel.attr('id') === 'decrypt_fileUploadPanel' ? true : false
        });
        if ($filePanel.attr('id') === 'encrypt_fileUploadPanel') {
          $encryptFileSelection.append($fileElement);
          isEncryptCached = false;
        } else if ($filePanel.attr('id') === 'decrypt_fileUploadPanel') {
          $decryptFileSelection.append($fileElement);
          isDecryptCached = false;
        }
      })
      .catch(function(error) {
        console.log(error);
        showError('Unknown Error', $fileUploadError);
      });
  }
  evt.target.value = '';
}

function afterLoadEnd($filePanel) {
  numUploadsInProgress--;
  if (numUploadsInProgress) {
    return;
  }
  if ($filePanel.attr('id') === 'encrypt_fileUploadPanel') {
    $encryptToPersonBtn.prop('disabled', false);
  } else if ($filePanel.attr('id') === 'decrypt_fileUploadPanel') {
    $decryptToDownloadBtn.prop('disabled', false);
  }
}

function onRemoveFile() {
  if ($encryptFileSelection.children().length === 1) {
    $encryptToPersonBtn.prop('disabled', true);
  }
  if ($decryptFileSelection.children().length === 1) {
    $decryptToDownloadBtn.prop('disabled', true);
  }
  isEncryptCached = false;
  isDecryptCached = false;
}

/**
 * @param {Array<Object>} recipients
 */
function addRecipientsToSelect(recipients) {
  $encryptKeySelect.empty();
  for (var i = 0; i < recipients.length; i++) {
    var $option = $('<option/>')
      .val(i)
      .text(recipients[i].userid + ' - ' + recipients[i].keyid.toUpperCase());
    $encryptKeySelect.append($option);
  }
}

/**
 * @param {File} file
 */
function addFileToDownload(file, $panel, options) {
  var $fileDownloadElement = fileLib.createFileDownloadElement(file, options);
  $panel.append($fileDownloadElement);
}

/**
 * @param {Object} recipient
 * @param {String} recipient.id
 * @param {String} recipient.name
 * @param {Number} recipient.index
 * @returns {*|jQuery|HTMLElement}
 */
function getRecipientButton(recipient) {
  var $button = getRemoveForRecipientButton({
    "title": l10n.map.editor_remove_upload,
    "data-index": recipient.index,
    "class": 'glyphicon glyphicon-remove btn-remove'
  });

  var $icon = getIconForRecipientButton();
  var $content = getContentForRecipientButton({
    name: recipient.name,
    email: recipient.email
  });

  return $('<div/>', {
    "title": recipient.name,
    "data-index": recipient.index,
    "class": 'recipientButton'
  })
    .append($icon)
    .append($content)
    .append($button);
}

/**
 * @param {Object} content
 * @param {String} content.name
 * @param {String} content.email
 * @returns {*|jQuery|HTMLElement}
 */
function getContentForRecipientButton(content) {
  return $('<div/>')
    .append($('<b/>').text(content.name))
    .append($('<small/>').text(content.email));
}

/**
 * @returns {*|jQuery|HTMLElement}
 */
function getIconForRecipientButton() {
  return $('<span/>', {class: 'glyphicon glyphicon-user'});
}

/**
 * @param {Object} options
 * @param {String} options.title
 * @param {Number} options.data-index
 * @param {String} options.class
 * @returns {*|jQuery|HTMLElement}
 */
function getRemoveForRecipientButton(options) {
  return $('<button/>', options).on("click", onRemoveRecipient);
}

/**
 * @param {Number} index
 * @param {String} status
 */
function toggleSelectionInKeyList(index, status) {
  var $options = $encryptKeySelect.children();

  if (status === 'ADD') {
    $($options[index]).prop('disabled', true);

    for (var i = 0; i < recipients.length; i++) {
      var pos = (i + index) % recipients.length;
      var $option = (index + 1 === recipients.length) ? $($options[0]) : $($options[pos + 1]);

      if ($option.prop('disabled') === false) {
        $option.prop('selected', true);
        break;
      }
    }
  } else if (status === 'REMOVE') {
    $($options[index]).prop('disabled', false);
  }

  if ($('option:disabled', $encryptKeySelect).length >= recipients.length) {
    $encryptKeySelect.prop('disabled', true);
    $encryptAddPersonBtn.prop('disabled', true);
  } else {
    $encryptKeySelect.prop('disabled', false);
    $encryptAddPersonBtn.prop('disabled', false);
  }
}

/**
 * @param {String} msg
 * @param {jQuery} $uiComponent
 */
function showError(msg, $uiComponent, fadeOut) {
  $uiComponent.text(msg).show();
  if (fadeOut) {
    window.setTimeout(function() {
      $uiComponent.fadeOut('slow');
    }, 2000);
  }
}

/**
 * @param {jQuery} $uiComponent
 */
function hideError($uiComponent) {
  $uiComponent.text('').hide();
}

/**
 * @param {jQuery} $uiComponent
 */
function hasError($uiComponent) {
  return Boolean($uiComponent.text());
}

/**
 * @param {jQuery} $panel
 * @param {Array<jQuery>} $panels
 */
function switchPanel($panel, $panels) {
  $panels.hide();
  $panel.show();
}

event.on('ready', init);
