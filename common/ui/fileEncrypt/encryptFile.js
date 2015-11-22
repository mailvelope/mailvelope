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

var mvelo = mvelo || null;
var options = options || null;

(function(options) {
  var file;
  var l10n;
  var numUploadsInProgress = 0;
  var recipients = [];
  var currentProgress;

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
  var $encryptBackToUploadBtn;
  var $encryptBackToPersonBtn;
  var $encryptFileSelection;

  var $encryptKeyList;
  var $encryptKeySelect;
  var $encryptAddPersonBtn;
  var $encryptFileUploadError;
  var $encryptFileDownloadError;

  var isEncryptCached = false;
  var isDecryptCached = false;

  var $decryptPanels;
  var $decryptFileUploadPanel;
  var $decryptFileDownloadPanel;
  var $decryptFileSelection;
  var $decryptFileUpload;
  var $decryptAddFileBtn;
  var $decryptFileUploadError;
  var $decryptFileDownloadError;
  var $decryptToDownloadBtn;
  var $decryptToUploadBtn;
  var $decryptFileDownload;

  // Get language strings from JSON
  mvelo.l10n.getMessages([
    'encrypt_upload_file_warning_too_big',
    'encrypt_upload_file_help'
  ], function(result) {
    l10n = result;
  });

  function init() {
    addEncryptInteractivity();
    addDeCryptInteractivity();

    var $waiting = $('.waiting', $encryptFileDownloadPanel).hide();
    mvelo.util.addLoadingAnimation($waiting);
    $('.alert').hide();

    options.getPublicKeys()
      .then(function(result) {
        recipients = result;
        addRecipientsToSelect(recipients);
      })
      .catch(function(error) {
        console.log(error);
      });

    currentProgress = mvelo.attachments.FILEENCRYPT;
    $('#encryptButton').on('click', function() {
      currentProgress = mvelo.attachments.FILEENCRYPT;
    });
    $('#decryptButton').on('click', function() {
      currentProgress = mvelo.attachments.FILEDECRYPT;
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
    $encryptFileUploadError = $('#encrypt_fileUploadError');
    $encryptFileDownloadError = $('#encrypt_fileDownloadError');

    $encryptFileUpload = $('#encrypt_fileUpload').change(onAddAttachment);
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
      .on('click', onEncryptAttachments);
    $encryptDownloadAllBtn = $('#encrypt_downloadAllBtn')
      .prop('disabled', true)
      .on('click', function() {
        console.log($encryptFileDownloadPanel);
      });
    $encryptBackToUploadBtn = $('#encrypt_backToUploadBtn')
      .on('click', function() {
        switchPanel($encryptFileUploadPanel, $encryptPanels);
      });
    $encryptBackToPersonBtn = $('#encrypt_backToPersonBtn')
      .on('click', function() {
        switchPanel($encryptPersonPanel, $encryptPanels);
      });
    $encryptFileDownload = $('#encrypt_fileDownload');

    var MAXFILEUPLOADSIZE = (mvelo.crx) ? mvelo.MAXFILEUPLOADSIZECHROME : mvelo.MAXFILEUPLOADSIZE;
    MAXFILEUPLOADSIZE = Math.ceil(MAXFILEUPLOADSIZE / 1024 / 1024);

    $encryptAddFileBtn.next()
      .text(l10n.encrypt_upload_file_help.replace('[size]', MAXFILEUPLOADSIZE));

    $encryptKeyList = $('#encrypt_keyList');
    $encryptKeySelect = $('#encrypt_keySelect');
    $encryptAddPersonBtn = $('#encrypt_addPersonBtn')
      .on('click', onAddRecipient);

    switchPanel($encryptFileUploadPanel, $encryptPanels);
  }

  /**
   *
   */
  function addDeCryptInteractivity() {
    $decryptFileUploadPanel = $('#decrypt_fileUploadPanel');
    $decryptFileDownloadPanel = $('#decrypt_fileDownloadPanel');
    $decryptPanels = $('.panel.decrypt-panel');
    $decryptFileUploadError = $('#decrypt_fileUploadError');
    $decryptFileDownloadError = $('#decrypt_fileDownloadError');
    $decryptFileSelection = $('#decrypt_fileSelection');
    $decryptFileDownload = $('#decrypt_fileDownload');

    $decryptFileUpload = $('#decrypt_fileUpload').on('change', onAddAttachment);
    $decryptAddFileBtn = $('#decrypt_addFileBtn')
      .on('click', function() {
        $decryptFileUpload.click();
      });

    var MAXFILEUPLOADSIZE = (mvelo.crx) ? mvelo.MAXFILEUPLOADSIZECHROME : mvelo.MAXFILEUPLOADSIZE;
    MAXFILEUPLOADSIZE = Math.ceil(MAXFILEUPLOADSIZE / 1024 / 1024);

    $decryptAddFileBtn.next()
      .text(l10n.encrypt_upload_file_help.replace('[size]', MAXFILEUPLOADSIZE));

    $decryptToDownloadBtn = $('#decrypt_goToDownloadBtn')
      .prop('disabled', true)
      .on('click', onDecryptAttachments);

    $decryptToUploadBtn = $('#decrypt_backToUploadBtn')
      .on('click', function() {
        switchPanel($decryptFileUploadPanel, $decryptPanels);
      });

    $encryptToDownloadBtn = $('#encrypt_goToDownloadBtn')
      .prop('disabled', true)
      .on('click', onEncryptAttachments);

    switchPanel($decryptFileUploadPanel, $decryptPanels);
  }

  /**
   * @param {Event} e
   */
  function onDecryptAttachments(e) {
    e.preventDefault();

    if (!isDecryptCached) {
      $('.waiting', $decryptFileDownloadPanel).show();
      var attachments = mvelo.attachments.getAttachments(currentProgress);
      options.getDecryptFiles(attachments)
        .then(function(files) {
          $('.waiting', $decryptFileDownloadPanel).hide();
          addAttachmentsToDownload(files);
          isDecryptCached = true;
        })
        .catch(function(error) {
          console.log(error);
        });
    }

    switchPanel($decryptFileDownloadPanel, $decryptPanels);
  }

  /**
   * @param {Event} e
   */
  function onEncryptAttachments(e) {
    e.preventDefault();

    if (!isEncryptCached) {
      $('.waiting', $encryptFileDownloadPanel).show();
      var attachments = mvelo.attachments.getAttachments(currentProgress);
      options.getEncryptFiles(attachments)
        .then(function(files) {
          $('.waiting', $encryptFileDownloadPanel).hide();
          addAttachmentsToDownload(files);
          isEncryptCached = true;
        })
        .catch(function(error) {
          console.log(error);
        });
    }
    switchPanel($encryptFileDownloadPanel, $encryptPanels);
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
   * @param {Event} evt
   */
  function onAddAttachment(evt) {
    var files = evt.target.files;

    if (currentProgress === mvelo.attachments.FILEENCRYPT) {
      hideError($encryptFileUploadError);
    }

    for (var i = 0; i < files.length; i++) {
      file = files[i];

      if (!mvelo.attachments.isLowerThanMaxSize(file)) {
        showError(l10n.encrypt_upload_file_warning_too_big, $encryptFileUploadError);
        throw Error(l10n.encrypt_upload_file_warning_too_big);
      }

      numUploadsInProgress++;
      mvelo.attachments.readUploadFile(file)
        .then(function(response) {
          response.file.content = response.content;
          response.file.id = mvelo.util.getHash();

          return mvelo.attachments.addAttachment(response.file, currentProgress);
        })
        .then(function(fileUI) {
          var $fileUI = fileUI;

          $fileUI.find('.removeAttachment').on('click', onRemoveAttachment);

          if (currentProgress === mvelo.attachments.FILEENCRYPT) {
            $encryptFileSelection.append($fileUI);
            $encryptToPersonBtn.prop('disabled', false);
            isEncryptCached = false;
          } else {
            $decryptFileSelection.append($fileUI);
            $decryptToDownloadBtn.prop('disabled', false);
            isDecryptCached = false;
          }
          numUploadsInProgress--;

        })
        .catch(function(error) {
          console.log(error);

          var msg = 'unbekannter Fehler';
          showError(msg, $('#fileUploadError'));
        });
    }
    evt.target.value = '';
  }

  /**
   * @param {Event} e
   */
  function onRemoveAttachment(e) {
    e.preventDefault();

    removeAttachment($(this).data('id'));

    if ($encryptFileSelection.children().length === 0) {
      $encryptToPersonBtn.prop('disabled', true);
    }
    if ($decryptFileSelection.children().length === 0) {
      $decryptToDownloadBtn.prop('disabled', true);
    }
    isEncryptCached = false;
    isDecryptCached = false;
  }

  /**
   * @param {Array<Object>} recipients
   */
  function addRecipientsToSelect(recipients) {
    for (var i = 0; i < recipients.length; i++) {
      var $option = $('<option/>')
        .val(i)
        .text(recipients[i].userid);
      $encryptKeySelect.append($option);
    }
  }

  /**
   * @param {Array} files
   */
  function addAttachmentsToDownload(files) {
    console.log(files);

    var keys = Object.keys(files);
    for (var i = 0; i < keys.length; i++) {
      file = files[keys[i]];

      mvelo.attachments.getAttachment(file, currentProgress)
        .then(function($fileUI) {
          if (currentProgress === mvelo.attachments.FILEENCRYPT) {
            $encryptFileDownload.append($fileUI);
          } else {
            $decryptFileDownload.append($fileUI);
          }
        })
        .catch(function(error) {
          console.log(error);
        });
    }
  }

  /**
   * @param {Number} id
   * @returns {boolean}
   * @throws {Error}
   */
  function removeAttachment(id) {
    mvelo.attachments.removeAttachment(id, currentProgress);
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
      "title": l10n.editor_remove_upload,
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
    var name = decodeURIComponent(escape(content.name));
    var email = decodeURIComponent(escape(content.email));

    return $('<div/>')
      .append($('<b/>').text(name))
      .append($('<small/>').text(email));
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
  function showError(msg, $uiComponent) {
    $uiComponent.text(msg).show();
  }

  /**
   * @param {jQuery} $uiComponent
   */
  function hideError($uiComponent) {
    $uiComponent.text('').hide();
  }

  /**
   * @param {jQuery} $panel
   * @param {Array<jQuery>} $panels
   */
  function switchPanel($panel, $panels) {
    $panels.hide();

    /*switch (id) {
      case 'fileUploadPanel':
        $encryptFileUploadPanel.show();
        break;
      case 'decryptPersonPanel':
        $encryptPersonPanel.show();
        break;
      case 'fileDownloadPanel':
        $encryptFileDownloadPanel.show();
        break;
    }*/
    $panel.show();
  }

  options.event.on('ready', init);
}(options));
