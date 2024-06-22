/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import Spinner from '../../components/util/Spinner';
import Notifications from '../../components/util/Notifications';
import FileUpload from '../../components/util/FileUpload';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import * as fileLib from '../../lib/file';
import {FileDownloadPanel} from '../../components/util/FilePanel';
import {normalizeArmored, getUUID, str2ab, encodeUtf8} from '../../lib/util';

import './Decrypt.scss';

l10n.register([
  'alert_header_error',
  'decrypt_decrypted_files_label',
  'decrypt_file_error_header',
  'decrypt_header',
  'decrypt_header_success',
  'decrypt_text_area_label',
  'decrypt_text_decryption_btn',
  'decrypt_text_error_header',
  'editor_encrypt_button',
  'editor_label_attachments',
  'encrypt_download_all_button',
  'file_read_error',
  'form_back',
  'notification_text_copy_to_clipboard',
  'signer_unknown',
  'text_decrypt_button',
  'upload_quota_exceeded_warning'
]);

export default class Decrypt extends React.Component {
  constructor() {
    super();
    this.state = {
      initializing: false,
      waiting: false,
      files: [],
      showTextInput: false,
      message: '',
      decrypted: [],
      notifications: []
    };
    this.handleDownloadAll = this.handleDownloadAll.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
  }

  componentDidMount() {
    this.fileUpload = new fileLib.FileUpload();
  }

  async handleDecrypt() {
    this.setState({waiting: true});
    if (this.state.files.length > 0) {
      await this.decryptFiles(this.state.files);
    }
    if (this.state.message !== '') {
      await this.decryptMessage(this.state.message);
    }
    this.setState({waiting: false});
  }

  handleBack() {
    this.setState({decrypted: []});
  }

  async decryptMessage(message) {
    try {
      const armored = normalizeArmored(message, /-----BEGIN PGP MESSAGE-----[\s\S]+?-----END PGP MESSAGE-----/);
      const {data, signatures} = await port.send('decrypt-message', {
        armored,
        uiLogSource: 'security_log_decrypt_ui'
      });
      const content = encodeUtf8(data);
      const signer = await this.getSignerDetails(signatures);
      this.setState(prevState => ({decrypted: [...prevState.decrypted, this.createFileObject({content, armored: message, filename: 'text.txt', signer, mimeType: 'text/plain'})]}));
    } catch (error) {
      this.setErrorNotification(error);
    }
  }

  decryptFiles(encryptedFiles) {
    return Promise.all(encryptedFiles.map(async encryptedFile => {
      try {
        const {data: content, filename, signatures} = await port.send('decrypt-file', {
          encryptedFile,
          uiLogSource: 'security_log_decrypt_ui'
        });
        const signer = await this.getSignerDetails(signatures);
        this.setState(prevState => ({decrypted: [...prevState.decrypted, this.createFileObject({content, filename, signer, mimeType: 'application/octet-stream'})]}));
      } catch (error) {
        this.setErrorNotification(error, encryptedFile.name);
      }
    }));
  }

  setErrorNotification(error, filename = '', source = 'decrypt') {
    const notification = {id: Date.now(), type: 'error', message: error.message};
    if (source === 'decrypt') {
      notification.header = filename ? l10n.get('decrypt_file_error_header', [filename]) : l10n.map.decrypt_text_error_header;
    } else {
      notification.header = l10n.get('file_read_error', [filename]);
    }
    if (error.code === 'NO_KEY_FOUND') {
      notification.hideDelay = 5500;
    }
    this.setState(prevState => ({notifications: [...prevState.notifications, notification]}));
  }

  async getSignerDetails(signatures) {
    if (!signatures.length) {
      return {label: l10n.map.file_not_signed, type: 'info'};
    }
    const signature = signatures[0];
    const keyId = signature.keyId ? signature.keyId : signature.fingerprint.substring(signature.fingerprint.length - 16);
    if (signature.valid === null) {
      return {label: `${l10n.get('file_signed', l10n.map.signer_unknown)} (${l10n.map.keygrid_keyid} ${keyId.toUpperCase()})`, type: 'warning'};
    }
    if (signature.valid) {
      const {name = l10n.map.signer_unknown} = signature.keyDetails || {};
      return {label: `${l10n.get('file_signed', name)} (${l10n.map.keygrid_keyid} ${keyId.toUpperCase()})`, type: 'success'};
    } else  {
      return {label: l10n.map.file_invalid_signed, type: 'danger'};
    }
  }

  createFileObject({content, filename, signer, mimeType, armored}) {
    const file = {
      id: getUUID(),
      name: filename,
      signer,
    };
    if (armored) {
      file.onShowPopup = () => this.handleOpenDecryptMessagePopup(armored);
    }
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    mimeType = 'application/octet-stream';
    const blob = new Blob([typeof content === 'string' ? str2ab(content) : content], {type: mimeType});
    file.objectURL = window.URL.createObjectURL(blob);
    return file;
  }

  async handleOpenDecryptMessagePopup(armored) {
    await port.send('decrypt-message-init');
    port.emit('decrypt-message-popup', {armored});
  }

  handleAddFile(files) {
    files = Array.from(files);
    const filesSize = files.reduce((total, file) => total + file.size, 0);
    const uploadedSize = this.state.files.reduce((total, file) => total + file.size, 0);
    const currentAttachmentsSize = uploadedSize + filesSize;
    if (currentAttachmentsSize > MAX_FILE_UPLOAD_SIZE) {
      this.setState({notifications: [{id: Date.now(), header: l10n.map.alert_header_error, message: `${l10n.map.upload_quota_exceeded_warning} ${Math.floor(MAX_FILE_UPLOAD_SIZE / (1024 * 1024))}MB.`, type: 'error'}]});
      return;
    }
    for (const file of files) {
      try {
        this.addFile(file);
      } catch (error) {
        this.setErrorNotification(error, file.name, 'upload');
      }
    }
  }

  addFile(file) {
    if (fileLib.isOversize(file)) {
      throw new Error(l10n.map.encrypt_upload_file_warning_too_big);
    }
    this.fileUpload.readFile(file)
    .then(file => this.setState(prevState => ({files: [...prevState.files, file]})));
  }

  handleRemoveFile(id) {
    this.setState(prevState => ({files: prevState.files.filter(file => file.id !== id)}));
  }

  handleDownloadAll() {
    const fileElements = this.fileDownloadElements.getElementsByClassName('file-header');
    for (const fileElement of fileElements) {
      setTimeout(() => fileElement.click(), 50);
    }
  }

  handleCopyToClipboard(text) {
    const temporay = document.createElement('textarea');
    document.body.appendChild(temporay);
    temporay.value = text;
    temporay.select();
    document.execCommand('copy');
    document.body.removeChild(temporay);
    this.setState({notifications: [{id: Date.now(), message: l10n.map.notification_text_copy_to_clipboard, hideDelay: 2500}]});
  }

  render() {
    return (
      <>
        <div className="decrypt jumbotron">
          <section className="card">
            {this.state.initializing ? (
              <Spinner delay={0} />
            ) : (
              <div className="card-body">
                {this.state.decrypted.length > 0 &&
                  <nav aria-label="breadcrumb">
                    <ol className="breadcrumb bg-transparent p-0">
                      <li className="breadcrumb-item"><a onClick={() => this.handleBack()}><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.decrypt_header}</a></li>
                    </ol>
                  </nav>
                }
                <div className="card-title d-flex flex-wrap align-items-center w-100">
                  <h1 className="flex-shrink-0 mr-auto">{!this.state.decrypted.length ? l10n.map.decrypt_header : l10n.map.decrypt_header_success}</h1>
                  <div className="flex-shrink-0">
                    {!this.state.decrypted.length &&
                      <button type="button" disabled={this.state.files.length === 0 && this.state.message === ''} onClick={() => this.handleDecrypt()} className="btn btn-primary">{l10n.map.text_decrypt_button}</button>
                    }
                    {this.state.decrypted.length > 1 &&
                      <button type="button" onClick={this.handleDownloadAll} className="btn btn-primary">{l10n.map.encrypt_download_all_button}</button>
                    }
                  </div>
                </div>
                <div className={this.state.decrypted.length ? 'd-none' : ''}>
                  <div className="form-group mb-5">
                    <label>{l10n.map.editor_label_attachments}</label>
                    <FileUpload files={this.state.files} filter={['.asc', '.gpg']} onRemoveFile={id => this.handleRemoveFile(id)} onChangeFileInput={files => this.handleAddFile(files)} />
                  </div>
                  <div className="form-group">
                    {!this.state.showTextInput ? (
                      <div className="d-flex justify-content-center">
                        <button type="button" onClick={() => this.setState({showTextInput: true})} className="btn btn-secondary">{l10n.map.decrypt_text_decryption_btn}</button>
                      </div>
                    ) : (
                      <>
                        <label>{l10n.map.decrypt_text_area_label}</label>
                        <textarea className="form-control mb-0" value={this.state.message} onChange={event => this.setState({message: event.target.value})} rows={8} autoFocus spellCheck="false" autoComplete="off" />
                      </>
                    )}
                  </div>
                </div>
                <div className={this.state.decrypted.length ? '' : 'd-none'}>
                  <div className="form-group mb-0">
                    <label>{l10n.map.decrypt_decrypted_files_label}</label>
                    <div ref={ref => this.fileDownloadElements = ref}>
                      <FileDownloadPanel className="d-inline-flex flex-column align-items-start" files={this.state.decrypted} onCopyToClipboard={this.handleCopyToClipboard} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {this.state.waiting && <Spinner delay={0} fullscreen={true} />}
          </section>
        </div>
        <Notifications items={!this.state.waiting ? this.state.notifications : []} />
      </>
    );
  }
}
