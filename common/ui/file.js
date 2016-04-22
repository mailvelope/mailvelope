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

(function(mvelo) {

  var l10n;

  // Get language strings from JSON
  mvelo.l10n.getMessages([
    'editor_remove_upload',
    'encrypt_download_file_button'
  ], function(result) {
    /**
     * @var l10n.editor_remove_upload
     */
    l10n = result;
  });

  /**
   * @param {File} file
   * @param {Number} file.size
   * @returns {boolean}
   */
  function isOversize(file) {
    return file.size >= mvelo.MAXFILEUPLOADSIZE;
  }

  /**
   * @returns {number}
   */
  function getFileSize($fileList) {
    var currentAttachmentsSize = 0;
    $fileList.find('.attachmentButton').each(function() {
      currentAttachmentsSize += $(this).data('file').size;
    });
    return currentAttachmentsSize;
  }

  /**
   * @param {File} file
   * @param {Number} file.lastModified
   * @param {Date} file.lastModifiedDate
   * @param {String} file.name
   * @param {Number} file.size
   * @param {String} file.type
   * @param {String} file.webkitRelativePath
   * @param {Funtion} onLoadEnd
   * @returns {Promise<Object, Error>}
   */
  function readUploadFile(file, onLoadEnd) {
    return new Promise(function(resolve, reject) {
      var fileReader = new FileReader();
      fileReader.onload = function() {
        resolve({
          content: this.result,
          id: mvelo.util.getHash(),
          name: file.name,
          size: file.size,
          type: file.type
        });
      };
      fileReader.onloadend = onLoadEnd;
      fileReader.onabort = function(evt) {
        reject(evt);
      };
      fileReader.readAsDataURL(file);
    });
  }

  function createFileElement(file, options) {
    options = options || {};
    var $button = $('<div/>', {
      "title": file.name,
      "class": 'attachmentButton'
    });
    $button.data('file', file);
    $button.append(getExtensionIcon(file));
    $button.append(getFileName(file));
    if (options.secureIcon) {
      $button.append(getSecureIcon());
    }
    if (options.removeButton) {
      $button.append(getRemoveButton(options.onRemove));
    }
    return $button;
  }

  function createFileDownloadElement(file, options) {
    options = options || {};
    var $button = $('<a/>', {
      "title": file.name,
      "download": file.name,
      "class": 'attachmentButton',
      "href": downloadAttachment(file)
    });
    $button.append(getExtensionIcon(file));
    $button.append(getFileName(file));
    if (options.secureIcon) {
      $button.append(getSecureIcon());
    }
    $button.append(getDownloadButton());
    return $button;
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @returns {*|jQuery}
   */
  function getFileName(file) {
    var fileNameNoExt = mvelo.util.extractFileNameWithoutExt(file.name);

    return $('<span/>', {
      "class": 'attachmentFilename'
    }).text(fileNameNoExt);
  }

  /**
   * @param {File} file
   * @param {String} file.id
   * @returns {*|jQuery}
   */
  function getDownloadButton() {
    return $('<span/>', {
      "title": l10n.encrypt_download_file_button,
      "class": 'glyphicon glyphicon-save saveAttachment'
    });
  }

  /**
   * @param {Function} onRemove
   * @returns {*|jQuery}
   */
  function getRemoveButton(onRemove) {
    return $('<span/>', {
      "title": l10n.editor_remove_upload,
      "class": 'glyphicon glyphicon-remove removeAttachment'
    }).on("click", function(e) {
      e.preventDefault();
      if (onRemove) {
        onRemove();
      }
      $(this).parent().remove();
    });
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.id
   * @returns {*|jQuery}
   */
  function getExtensionIcon(file) {
    var fileExt = mvelo.util.extractFileExtension(file.name);
    if (!fileExt) {
      return '';
    }
    var extClass = mvelo.util.getExtensionClass(fileExt);

    return $('<span/>', {
      "class": 'attachmentExtension ' + extClass
    }).text(fileExt);
  }

  /**
   * @returns {*|jQuery|HTMLElement}
   */
  function getSecureIcon() {
    return $('<span/>', {
      'class': 'glyphicon glyphicon-lock secure-icon'
    });
  }

  /**
   * @param {File} file
   * @param {String} file.content
   * @param {String} file.type
   * @returns {string}
   */
  function downloadAttachment(file) {
    var content = mvelo.util.str2ab(file.content);
    var blob = new Blob([content], { type: file.type });

    return window.URL.createObjectURL(blob);
  }

  /**
   * @returns {Object}
   */
  function getFiles($fileList) {
    var files = [];
    $fileList.find('.attachmentButton').each(function() {
      files.push($(this).data('file'));
    });
    return files;
  }

  mvelo.file = mvelo.file || {
    isOversize: isOversize,
    getFileSize: getFileSize,
    readUploadFile: readUploadFile,
    createFileElement: createFileElement,
    createFileDownloadElement: createFileDownloadElement,
    getFiles: getFiles
  };

}(mvelo));
