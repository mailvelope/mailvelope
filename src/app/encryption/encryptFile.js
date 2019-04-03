/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import {port} from '../app';
import * as l10n from '../../lib/l10n';
import {addLoadingAnimation} from '../../lib/util';
import * as fileLib from '../../lib/file';
import EncryptFooter from './components/EncryptFooter';

import './encrypt.css';

let numUploadsInProgress = 0;
let recipients = [];
const MAX_FILE_UPLOAD_SIZE_MB = Math.ceil(MAX_FILE_UPLOAD_SIZE / 1024 / 1024);

let $encryptPanels;
let $encryptFileUploadPanel;
let $encryptFileDownloadPanel;
let $encryptPersonPanel;
let $encryptFileUpload;
let $encryptFileDownload;
let $encryptToPersonBtn;
let $encryptAddFileBtn;
let $encryptDownloadAllBtn;
let $encryptFileSelection;

let $encryptKeyList;
let $encryptKeySelect;
let $encryptAddPersonBtn;
let $encryptFileDownloadError;

let isEncryptCached = false;
let isDecryptCached = false;

let $decryptPanels;
let $decryptFileUploadPanel;
let $decryptFileDownloadPanel;
let $decryptFileSelection;
let $decryptFileUpload;
let $decryptAddFileBtn;
let $decryptFileDownloadError;
let $decryptToDownloadBtn;
let $decryptDownloadAllBtn;
let $decryptFileDownload;

// Get language strings from JSON
l10n.register([
  'editor_encrypt_button',
  'encrypt_dialog_add',
  'encrypt_dialog_header',
  'encrypt_dialog_subheader',
  'encrypt_download_file_title',
  'encrypt_download_all_button',
  'encrypt_file_selection',
  'encrypt_upload_file_warning_too_big',
  'encrypt_upload_file_help',
  'form_next',
  'form_back'
]);

// reference to EncryptFile component
let encryptFile;

export default class EncryptFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      encryptDisabled: true,
      armored: false
    };
    encryptFile = this;
  }

  componentDidMount() {
    init();
  }

  render() {
    return (
      <>
        <div id="file_encrypting" className={this.props.match.path !== '/encryption/file-encrypt' ? 'd-none' : ''}>
          <div id="encrypt_fileUploadPanel" className="encrypt-panel card">
            <div className="card-header">
              {l10n.map.encrypt_file_selection}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-9">
                  <output id="encrypt_fileSelection" className="itemSelection"></output>
                </div>
                <div className="col-3">
                  <p>
                    <input id="encrypt_fileUpload" type="file" className="d-none" multiple />
                    <button type="button" id="encrypt_addFileBtn" className="btn btn-sm btn-secondary btn-block">
                      <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.encrypt_dialog_add}
                    </button>
                    <small className="form-text text-muted"></small>
                  </p>
                </div>
              </div>
              <div className="fileUploadError alert alert-danger" role="alert"></div>
            </div>
            <div className="card-footer text-right">
              <button type="button" id="encrypt_goToPersonBtn" className="btn btn-primary btn-sm">{l10n.map.form_next}</button>
            </div>
          </div>

          <div id="encrypt_personPanel" className="encrypt-panel card">
            <div className="card-header">
              {l10n.map.encrypt_dialog_header}
            </div>
            <div className="card-body">
              <div className="row align-items-center form-group">
                <div className="col-9">
                  <select id="encrypt_keySelect" className="custom-select custom-select-sm"></select>
                </div>
                <div className="col-3">
                  <button type="button" id="encrypt_addPersonBtn" className="btn btn-sm btn-secondary btn-block">
                    <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.encrypt_dialog_add}
                  </button>
                </div>
              </div>
              <h5>{l10n.map.encrypt_dialog_subheader}</h5>
              <div className="row">
                <div className="col-12">
                  <output id="encrypt_keyList" className="itemSelection"></output>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <EncryptFooter encryptDisabled={this.state.encryptDisabled} armored={this.state.armored}
                onBack={() => switchPanel($encryptFileUploadPanel, $encryptPanels)}
                onEncrypt={onEncryptFiles}
                onChangeArmored={armored => {
                  isEncryptCached = false;
                  this.setState({armored});
                }}

              />
            </div>
          </div>

          <div id="encrypt_fileDownloadPanel" className="encrypt-panel card">
            <div className="card-header">
              {l10n.map.encrypt_download_file_title}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-12">
                  <output id="encrypt_fileDownload" className="itemSelection"></output>
                </div>
              </div>
              <div id="encrypt_fileDownloadError" className="alert alert-danger" role="alert"></div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button type="button" id="encrypt_backToPersonBtn" className="btn btn-sm btn-secondary mr-1">{l10n.map.form_back}</button>
              <button type="button" id="encrypt_downloadAllBtn" className="btn btn-sm btn-primary"><span className="icon icon-download" aria-hidden="true"></span> {l10n.map.encrypt_download_all_button}</button>
            </div>
            <div className="panel-overlay">
              <div className="waiting"></div>
            </div>
          </div>

        </div>
        <div id="file_decrypting" className={this.props.match.path !== '/encryption/file-decrypt' ? 'd-none' : ''}>
          <div id="decrypt_fileUploadPanel" className="decrypt-panel card">
            <div className="card-header">
              {l10n.map.encrypt_file_selection}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-9">
                  <output id="decrypt_fileSelection" className="itemSelection"></output>
                </div>
                <div className="col-3">
                  <p>
                    <input id="decrypt_fileUpload" type="file" className="d-none" multiple accept=".asc,.gpg,.pgp" />
                    <button type="button" id="decrypt_addFileBtn" className="btn btn-sm btn-secondary btn-block">
                      <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.encrypt_dialog_add}
                    </button>
                    <small className="form-text text-muted"></small>
                  </p>
                </div>
              </div>
              <div className="fileUploadError alert alert-danger" role="alert"></div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button type="button" id="decrypt_goToDownloadBtn" className="btn btn-primary btn-sm">{l10n.map.form_next}</button>
            </div>
          </div>

          <div id="decrypt_fileDownloadPanel" className="decrypt-panel card">
            <div className="card-header">
              {l10n.map.encrypt_download_file_title}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-12">
                  <output id="decrypt_fileDownload" className="itemSelection"></output>
                </div>
              </div>
              <div id="decrypt_fileDownloadError" className="alert alert-danger" role="alert"></div>
            </div>

            <div className="card-footer d-flex justify-content-end">
              <button type="button" id="decrypt_backToUploadBtn" className="btn btn-sm btn-secondary mr-1">{l10n.map.form_back}</button>
              <button type="button" id="decrypt_downloadAllBtn" className="btn btn-sm btn-primary"><span className="icon icon-download" aria-hidden="true"></span> {l10n.map.encrypt_download_all_button}</button>
            </div>

            <div className="panel-overlay">
              <div className="waiting"></div>
            </div>
          </div>

        </div>
      </>
    );
  }
}

EncryptFile.propTypes = {
  match: PropTypes.object
};

function init() {
  addEncryptInteractivity();
  addDecryptInteractivity();

  $('#encrypting .alert').hide();

  initRecipientsSelection();
}

function initRecipientsSelection() {
  port.send('get-all-key-data')
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
  $encryptPanels = $('.card.encrypt-panel');
  $encryptFileSelection = $('#encrypt_fileSelection');
  $encryptFileDownloadError = $('#encrypt_fileDownloadError');

  const $waiting = $('.waiting', $encryptFileDownloadPanel).hide();
  addLoadingAnimation($waiting);

  $encryptFileUpload = $('#encrypt_fileUpload').change(onAddFile.bind(null, $encryptFileUploadPanel));
  $encryptAddFileBtn = $('#encrypt_addFileBtn')
  .on('click', () => {
    $encryptFileUpload.click();
  });
  $encryptToPersonBtn = $('#encrypt_goToPersonBtn')
  .prop('disabled', true)
  .on('click', () => {
    switchPanel($encryptPersonPanel, $encryptPanels);
  });
  $encryptDownloadAllBtn = $('#encrypt_downloadAllBtn')
  .prop('disabled', true)
  .on('click', () => {
    $encryptFileDownload.children().each(function() {
      this.click();
    });
  });
  $('#encrypt_backToPersonBtn')
  .on('click', () => {
    switchPanel($encryptPersonPanel, $encryptPanels);
  });
  $encryptFileDownload = $('#encrypt_fileDownload');

  $encryptAddFileBtn.next()
  .text(l10n.map.encrypt_upload_file_help.replace('##', MAX_FILE_UPLOAD_SIZE_MB));

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
  $decryptPanels = $('.card.decrypt-panel');
  $decryptFileDownloadError = $('#decrypt_fileDownloadError');
  $decryptFileSelection = $('#decrypt_fileSelection');
  $decryptFileDownload = $('#decrypt_fileDownload');

  const $waiting = $('.waiting', $decryptFileDownloadPanel).hide();
  addLoadingAnimation($waiting);

  $decryptFileUpload = $('#decrypt_fileUpload').on('change', onAddFile.bind(null, $decryptFileUploadPanel));
  $decryptAddFileBtn = $('#decrypt_addFileBtn')
  .on('click', () => {
    $decryptFileUpload.click();
  });

  $decryptAddFileBtn.next()
  .text(l10n.map.encrypt_upload_file_help.replace('##', MAX_FILE_UPLOAD_SIZE_MB));

  $decryptToDownloadBtn = $('#decrypt_goToDownloadBtn')
  .prop('disabled', true)
  .on('click', onDecryptFiles);

  $decryptDownloadAllBtn = $('#decrypt_downloadAllBtn')
  .prop('disabled', true)
  .on('click', () => {
    $decryptFileDownload.children().each(function() {
      this.click();
    });
  });

  $('#decrypt_backToUploadBtn')
  .on('click', () => {
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
    const encryptedFiles = fileLib.getFiles($decryptFileUploadPanel);
    decryptFiles(encryptedFiles)
    .catch(error => {
      showError(error.message, $decryptFileDownloadError);
    })
    .then(() => {
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
  const decryptProcesses = [];
  encryptedFiles.forEach(encryptedFile => {
    decryptProcesses.push(port.send('decryptFile', {encryptedFile})
    .then(file => {
      addFileToDownload({
        name: file.filename,
        content: file.data,
        type: 'application/octet-stream'
      }, $decryptFileDownload);
    })
    .catch(error => {
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
    const plainFiles = fileLib.getFiles($encryptFileUploadPanel);
    const receipients = getSelectedRecipients();
    encryptFiles(plainFiles, receipients)
    .then(() => {
      isEncryptCached = true;
      $encryptDownloadAllBtn.prop('disabled', false);
    })
    .catch(error => {
      isEncryptCached = false;
      $encryptDownloadAllBtn.prop('disabled', true);
      showError(error.message, $encryptFileDownloadError);
    })
    .then(() => {
      $('.waiting', $encryptFileDownloadPanel).hide();
    });
  }
  switchPanel($encryptFileDownloadPanel, $encryptPanels);
}

function encryptFiles(plainFiles, receipients) {
  const encryptProcesses = [];
  const {armored} = encryptFile.state;
  plainFiles.forEach(plainFile => {
    encryptProcesses.push(
      port.send('encryptFile', {plainFile, encryptionKeyFprs: receipients.map(r => r.fingerprint), armor: armored})
      .then(content => addFileToDownload({
        name: `${plainFile.name}${armored ? '.asc' : '.gpg'}`,
        content,
        type: 'application/octet-stream'
      }, $encryptFileDownload, {secureIcon: true}))
    );
  });
  return Promise.all(encryptProcesses);
}

function getSelectedRecipients() {
  const result = [];
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
  const $selected = $('option:selected', $encryptKeySelect);
  const index = parseInt($selected.val());
  const recipient = $.extend(recipients[index], {
    index
  });

  $encryptKeyList.append(getRecipientButton(recipient));

  toggleSelectionInKeyList(index, 'ADD');
  if ($encryptKeyList.has('.recipientButton').length) {
    encryptFile.setState({encryptDisabled: false});
  }
  isEncryptCached = false;
}

/**
 * Remove recipient from the selection field
 * @param {Event} e
 */
function onRemoveRecipient(e) {
  e.preventDefault();

  const $this = $(this);
  toggleSelectionInKeyList($this.data('index'), 'REMOVE');

  $this.parent().remove();
  if (!$encryptKeyList.has('.recipientButton').length) {
    encryptFile.setState({encryptDisabled: true});
  }
  isEncryptCached = false;
}

/**
 * @param {jQuery} $filePanel
 * @param {Event} evt
 */
function onAddFile($filePanel, evt) {
  const files = evt.target.files;

  const $fileUploadError = $filePanel.find('.fileUploadError');

  hideError($fileUploadError);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (fileLib.isOversize(file)) {
      showError(l10n.map.encrypt_upload_file_warning_too_big, $fileUploadError, true);
      continue;
    }

    numUploadsInProgress++;
    fileLib.readUploadFile(file, afterLoadEnd.bind(null, $filePanel))
    .then(response => {
      const $fileElement = fileLib.createFileElement(response, {
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
    .catch(error => {
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
  for (let i = 0; i < recipients.length; i++) {
    const $option = $('<option/>')
    .val(i)
    .text(`${recipients[i].userId} - ${recipients[i].keyId}`);
    $encryptKeySelect.append($option);
  }
}

/**
 * @param {File} file
 */
function addFileToDownload(file, $panel, options) {
  const $fileDownloadElement = fileLib.createFileDownloadElement(file, options);
  $panel.append($fileDownloadElement);
}

/**
 * @param {Object} recipient
 * @param {String} recipient.keyId
 * @param {String} recipient.name
 * @param {Number} recipient.index
 * @returns {*|jQuery|HTMLElement}
 */
function getRecipientButton(recipient) {
  const $button = getRemoveForRecipientButton({
    'title': l10n.map.editor_remove_upload,
    'data-index': recipient.index,
    'class': 'icon icon-close btn-remove'
  });

  const $icon = getIconForRecipientButton();
  const $content = getContentForRecipientButton({
    name: recipient.name,
    email: recipient.email
  });

  return $('<div/>', {
    'title': recipient.name,
    'data-index': recipient.index,
    'class': 'recipientButton'
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
  .addClass('text-muted')
  .append($('<strong/>').text(content.name))
  .append($('<small/>').text(content.email));
}

/**
 * @returns {*|jQuery|HTMLElement}
 */
function getIconForRecipientButton() {
  return $('<i/>', {class: 'fa fa-user'});
}

/**
 * @param {Object} options
 * @param {String} options.title
 * @param {Number} options.data-index
 * @param {String} options.class
 * @returns {*|jQuery|HTMLElement}
 */
function getRemoveForRecipientButton(options) {
  return $('<button/>', options).on('click', onRemoveRecipient);
}

/**
 * @param {Number} index
 * @param {String} status
 */
function toggleSelectionInKeyList(index, status) {
  const $options = $encryptKeySelect.children();

  if (status === 'ADD') {
    $($options[index]).prop('disabled', true);

    for (let i = 0; i < recipients.length; i++) {
      const pos = (i + index) % recipients.length;
      const $option = (index + 1 === recipients.length) ? $($options[0]) : $($options[pos + 1]);

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
    window.setTimeout(() => {
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
