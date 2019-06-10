/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MAX_FILE_UPLOAD_SIZE} from './constants';
import {getHash} from './util';

/**
 * @param {File} file
 * @param {Number} file.size
 * @returns {boolean}
 */
export function isOversize(file) {
  return file.size >= MAX_FILE_UPLOAD_SIZE;
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

export function extractFileNameWithoutExt(fileName) {
  const indexOfDot = fileName.lastIndexOf('.');
  if (indexOfDot > 0) { // case: regular
    return fileName.substring(0, indexOfDot);
  } else {
    return fileName;
  }
}

export function extractFileExtension(fileName) {
  const lastindexDot = fileName.lastIndexOf('.');
  if (lastindexDot <= 0) { // no extension
    return '';
  } else {
    return fileName.substring(lastindexDot + 1, fileName.length).toLowerCase().trim();
  }
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
