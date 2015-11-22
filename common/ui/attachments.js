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
  var encryptAttachments = {};
  var decryptAttachments = {};
  var FILEENCRYPT = 'file_encrypt';
  var FILEDECRYPT = 'file_decrypt';

  // Get language strings from JSON
  mvelo.l10n.getMessages([
    'editor_remove_upload'
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
  function isLowerThanMaxSize(file) {
    return file.size <= mvelo.MAXFILEUPLOADSIZE;
  }

  /**
   * @returns {number}
   */
  function getFileSize() {
    var currentAttachmentsSize = 0;
    for (var property in encryptAttachments) {
      if (encryptAttachments.hasOwnProperty(property)) {
        currentAttachmentsSize = currentAttachmentsSize + encryptAttachments[property].size;
      }
    }
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
   * @returns {Promise<Object, Error>}
   */
  function readUploadFile(file) {
    return new Promise(function(resolve, reject) {
      var fileReader = new FileReader();
      fileReader.onload = function() {
        resolve({
          content: this.result,
          file: file
        });
      };
      fileReader.onabort = function(evt) {
        reject(evt);
      };
      fileReader.readAsDataURL(file);
    });
  }

  /**
   * @param {File} file
   * @param {String} file.id
   * @param {Number} file.lastModified
   * @param {Date} file.lastModifiedDate
   * @param {String} file.name
   * @param {Blob} file.content
   * @param {Number} file.size
   * @param {String} file.type
   * @param {String} file.webkitRelativePath
   * @param {String} currentProgress
   * @returns {Promise<jQuery>}
   */
  function addAttachment(file, currentProgress) {
    return new Promise(function(resolve) {
      if (encryptAttachments[file.id] && encryptAttachments[file.id].uploadUI) {
        resolve(encryptAttachments[file.id].uploadUI);
      }

      var fileUI;
      if (currentProgress === FILEENCRYPT) {
        fileUI = createEncryptFileUploadButton(file);

        // Add attachment
        encryptAttachments[file.id] = $.extend({
          uploadUI: fileUI
        }, file);
      } else {
        fileUI = createDecryptFileUploadButton(file);

        // Add attachment
        decryptAttachments[file.id] = $.extend({
          uploadUI: fileUI
        }, file);
      }

      resolve(fileUI);
    });
  }

  /**
   * @param {Object} file
   * @param {String} file.name
   * @param {String} file.id
   * @param {String} file.content
   * @param {String} file.size
   * @param {String} file.type
   * @param {String} currentPage
   * @returns {Promise<jQuery>}
   */
  function getAttachment(file, currentPage) {
    return new Promise(function(resolve) {
      if (encryptAttachments[file.id] && encryptAttachments[file.id].downloadUI) {
        resolve(encryptAttachments[file.id].downloadUI);
      }
      var fileUI = (currentPage === FILEDECRYPT) ? createDecryptFileDownloadButton(file) : createEncryptFileDownloadButton(file);

      // Add attachment
      encryptAttachments[file.id] = $.extend({
        downloadUI: fileUI
      }, file);

      resolve(fileUI);
    });
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.id
   * @param {String} file.content
   * @param {String} file.size
   * @param {String} file.type
   * @returns {*|jQuery}
   */
  function createEncryptFileUploadButton(file) {
    var $removeUploadButton = getRemoveButton(file);
    var $extensionButton = getExtensionIcon(file);
    var $fileName = getFileName(file);

    return $('<div/>', {
      "title": file.name,
      "class": 'attachmentButton',
      "data-id": file.id
    })
      .append($extensionButton)
      .append($fileName)
      .append($removeUploadButton);
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.id
   * @param {String} file.content
   * @param {String} file.size
   * @param {String} file.type
   * @returns {*|jQuery}
   */
  function createDecryptFileUploadButton(file) {
    var $removeUploadButton = getRemoveButton(file);
    var $extensionButton = getExtensionIcon(file);
    var $secureIcon = getSecureIcon(file);
    var $fileName = getFileName(file);

    return $('<div/>', {
      "title": file.name,
      "class": 'attachmentButton',
      "data-id": file.id
    })
      .append($extensionButton)
      .append($fileName)
      .append($secureIcon)
      .append($removeUploadButton);
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.id
   * @param {String} file.content
   * @param {String} file.size
   * @param {String} file.type
   * @returns {*|jQuery}
   */
  function createEncryptFileDownloadButton(file) {
    var $downloadButton = getDownloadButton(file);
    var $extensionIcon = getExtensionIcon(file);
    var $fileName = getFileName(file);

    return $('<a/>', {
      "title": file.name,
      "class": 'attachmentButton',
      "data-id": file.id,
      "href": downloadAttachment(file)
    })
      .append($extensionIcon)
      .append($fileName)
      .append($downloadButton);
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.id
   * @param {String} file.content
   * @param {String} file.size
   * @param {String} file.type
   * @returns {*|jQuery}
   */
  function createDecryptFileDownloadButton(file) {
    var $downloadButton = getDownloadButton(file);
    var $secureIcon = getSecureIcon(file);
    var $extensionIcon = getExtensionIcon(file);
    var $fileName = getFileName(file);

    return $('<a/>', {
      "title": file.name,
      "class": 'attachmentButton',
      "data-id": file.id,
      "href": downloadAttachment(file)
    })
      .append($extensionIcon)
      .append($fileName)
      .append($secureIcon)
      .append($downloadButton);
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
    }).append(fileNameNoExt);
  }

  /**
   * @param {File} file
   * @param {String} file.id
   * @returns {*|jQuery}
   */
  function getDownloadButton(file) {
    return $('<span/>', {
      "data-id": file.id,
      "title": l10n.editor_remove_upload,
      "class": 'glyphicon glyphicon-save saveAttachment'
    }).on("click", function(e) {
      e.preventDefault();
      //downloadAttachment($(this).attr("data-id"));
    });
  }

  /**
   * @param {File} file
   * @param {String} file.id
   * @returns {*|jQuery}
   */
  function getRemoveButton(file) {
    return $('<span/>', {
      "data-id": file.id,
      "title": l10n.editor_remove_upload,
      "class": 'glyphicon glyphicon-remove removeAttachment'
    }).on("click", function(e) {
      e.preventDefault();
      removeAttachment($(this).attr("data-id"));
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
    var extClass = mvelo.util.getExtensionClass(fileExt);

    return $('<span/>', {
      "data-id": file.id,
      "class": 'attachmentExtension ' + extClass
    }).append(fileExt);
  }

  /**
   * @param {File} file
   * @param {String} file.id
   * @returns {*|jQuery|HTMLElement}
   */
  function getSecureIcon(file) {
    return $('<span/>', {
      'class': 'glyphicon glyphicon-lock secure-icon'
    });
  }

  /**
   * @param {Number} id
   * @param {String} currentPage
   * @returns {boolean}
   */
  function removeAttachment(id, currentPage) {
    try {
      if (currentPage === FILEENCRYPT) {
        delete encryptAttachments[id];
      } else {
        delete decryptAttachments[id];
      }
      return true;
    } catch (e) {
      throw Error('Can not delete attachment');
    }
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

    return window.URL.createObjectURL(blob) || '#';
  }

  /**
   * @param {File} file
   * @param {String} file.name
   * @param {String} file.objectURL
   * @returns {Promise.<Object>}
   */
  function getLinkFromFile(file) {
    return new Promise(function(resolve) {

      var $fileName = $('<span/>').html(file.name);

      var $fileUI = $('<a/>', {
        'download': file.name,
        'href': file.objectURL,
        'title': file.name,
        'class': 'attachmentButton'
      })
        .append($fileName);

      resolve($fileUI);
    });
  }

  /**
   * @param {File} file
   * @param {Object} file.content
   * @param {String} file.type
   * @returns {Promise.<File>}
   */
  function getObjectUrl(file) {
    return new Promise(function(resolve) {
      var content = mvelo.util.str2ab(file.content);
      var blob = new Blob([content], { type: file.type });

      file.objectURL = window.URL.createObjectURL(blob) || '#';

      resolve(file);
    });
  }

  /**
   * @param {File} file
   * @returns {Promise.<File, Error>}
   */
  function getReadFile(file) {
    return new Promise(function(resolve, reject) {
      var fileReader = new FileReader();
      fileReader.onload = function(evt) {
        /*sendMessage({
         event: 'popup-file-upload',
         data: this
         });*/
        resolve(evt);
      };
      fileReader.onabort = function(evt) {
        reject(evt);
      };

      fileReader.readAsDataURL(file);
    });
  }

  /**
   * @returns {Object}
   */
  function getAttachments(currentProgress) {
    if (currentProgress === FILEENCRYPT) {
      return encryptAttachments;
    } else {
      return decryptAttachments;
    }
  }

  // for fixfox, mvelo.l10n is exposed from a content script
  mvelo.attachments = mvelo.attachments || mvelo.crx && {
      isLowerThanMaxSize: isLowerThanMaxSize,
      getFileSize: getFileSize,
      readUploadFile: readUploadFile,
      addAttachment: addAttachment,
      getAttachment: getAttachment,
      removeAttachment: removeAttachment,
      getObjectUrl: getObjectUrl,
      getReadFile: getReadFile,
      getAttachments: getAttachments,

      FILEENCRYPT: FILEENCRYPT,
      FILEDECRYPT: FILEDECRYPT
    };
}(mvelo));
