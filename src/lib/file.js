/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import * as l10n from './l10n';

'use strict';


l10n.register([
  'editor_remove_upload',
  'encrypt_download_file_button'
]);

/**
 * @param {File} file
 * @param {Number} file.size
 * @returns {boolean}
 */
export function isOversize(file) {
  return file.size >= mvelo.MAXFILEUPLOADSIZE;
}

/**
 * @returns {number}
 */
export function getFileSize($fileList) {
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
export function readUploadFile(file, onLoadEnd) {
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

export function createFileElement(file, options) {
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

export function createFileDownloadElement(file, options) {
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
    "title": l10n.map.encrypt_download_file_button,
    "class": 'glyphicon glyphicon-save saveAttachment'
  });
}

/**
 * @param {Function} onRemove
 * @returns {*|jQuery}
 */
function getRemoveButton(onRemove) {
  return $('<span/>', {
    "title": l10n.map.editor_remove_upload,
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
export function getFiles($fileList) {
  var files = [];
  $fileList.find('.attachmentButton').each(function() {
    files.push($(this).data('file'));
  });
  return files;
}
