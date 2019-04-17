/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from './l10n';
import {MAX_FILE_UPLOAD_SIZE} from './constants';
import {getHash, str2ab} from './util';

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
  return file.size >= MAX_FILE_UPLOAD_SIZE;
}

/**
 * @returns {number}
 */
export function getFileSize($fileList) {
  let currentAttachmentsSize = 0;
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
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      resolve({
        content: this.result,
        id: getHash(),
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
  const $button = $('<div/>', {
    'title': file.name,
    'class': 'attachmentButton'
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
  const $button = $('<a/>', {
    'title': file.name,
    'download': file.name,
    'class': 'attachmentButton',
    'href': downloadAttachment(file)
  });
  $button.append(getExtensionIcon(file));
  $button.append(getFileName(file));
  if (options.secureIcon) {
    $button.append(getSecureIcon());
  }
  $button.append(getDownloadButton());
  return $button;
}

export function extractFileNameWithoutExt(fileName) {
  const indexOfDot = fileName.lastIndexOf('.');
  if (indexOfDot > 0) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else {
    return fileName;
  }
}

/**
 * @param {File} file
 * @param {String} file.name
 * @returns {*|jQuery}
 */
function getFileName(file) {
  const fileNameNoExt = extractFileNameWithoutExt(file.name);

  return $('<span/>', {
    'class': 'attachmentFilename'
  }).text(fileNameNoExt);
}

/**
 * @param {File} file
 * @param {String} file.id
 * @returns {*|jQuery}
 */
function getDownloadButton() {
  return $('<i/>', {
    'title': l10n.map.encrypt_download_file_button,
    'class': 'icon icon-download saveAttachment'
  });
}

/**
 * @param {Function} onRemove
 * @returns {*|jQuery}
 */
function getRemoveButton(onRemove) {
  return $('<span/>', {
    'title': l10n.map.editor_remove_upload,
    'class': 'icon icon-close removeAttachment'
  }).on('click', function(e) {
    e.preventDefault();
    if (onRemove) {
      onRemove();
    }
    $(this).parent().remove();
  });
}

export function extractFileExtension(fileName) {
  const lastindexDot = fileName.lastIndexOf('.');
  if (lastindexDot <= 0) { // no extension
    return '';
  } else {
    return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
  }
}

export function getExtensionClass(fileExt) {
  let extClass = '';
  if (fileExt) {
    extClass = `ext-color-${fileExt}`;
  }
  return extClass;
}

/**
 * @param {File} file
 * @param {String} file.name
 * @param {String} file.id
 * @returns {*|jQuery}
 */
function getExtensionIcon(file) {
  const fileExt = extractFileExtension(file.name);
  if (!fileExt) {
    return '';
  }
  const extClass = getExtensionClass(fileExt);

  return $('<span/>', {
    'class': `attachmentExtension ${extClass}`
  }).text(fileExt);
}

/**
 * @returns {*|jQuery|HTMLElement}
 */
function getSecureIcon() {
  return $('<span/>', {
    'class': 'icon icon-lock secure-icon'
  });
}

/**
 * @param {File} file
 * @param {String} file.content
 * @param {String} file.type
 * @returns {string}
 */
function downloadAttachment({content, type, name}) {
  const ab = str2ab(content);
  const file = new File([ab], name, {type});

  return window.URL.createObjectURL(file);
}

/**
 * @returns {Object}
 */
export function getFiles($fileList) {
  const files = [];
  $fileList.find('.attachmentButton').each(function() {
    files.push($(this).data('file'));
  });
  return files;
}

export class FileUpload {
  constructor() {
    // flag to monitor upload-in-progress status
    this.numUploadsInProgress = 0;
    // buffer for actions after upload finished
    this.actions = null;
  }

  readFile(file) {
    this.numUploadsInProgress++;
    return readUploadFile(file, this.onLoadEnd)
    .catch(error => {
      this.onLoadEnd();
      throw error;
    });
  }

  inProgress() {
    return this.actions !== null;
  }

  registerAction(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Wrong parameter type, register only functions as actions');
    }
    this.action = fn;
  }

  onLoadEnd() {
    this.numUploadsInProgress--;
    if (this.numUploadsInProgress === 0 && this.actions) {
      this.action();
      this.action = null;
    }
  }
}
