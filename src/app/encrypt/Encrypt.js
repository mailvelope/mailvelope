/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import {RecipientInput} from '../../components/editor/components/RecipientInput';
import Spinner from '../../components/util/Spinner';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';
import Notifications from '../../components/util/Notifications';
import FileUpload from '../../components/util/FileUpload';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import * as fileLib from '../../lib/file';
import PlainText from '../../components/editor/components/PlainText';
import {FileDownloadPanel} from '../../components/util/FilePanel';
import {getHash, str2ab} from '../../lib/util';

import './Encrypt.scss';

l10n.register([
  'encrypt_header',
  'encrypt_header_success',
  'editor_encrypt_button',
  'editor_label_recipient',
  'editor_label_attachments',
  'editor_label_message',
  'encrypt_download_all_button',
  'alert_header_error',
  'upload_quota_exceeded_warning',
  'encrypt_upload_file_warning_too_big',
  'form_back',
  'notification_text_copy_to_clipboard',
  'encrypt_signer_info',
  'encrypt_no_signer_info',
  'change_link',
  'encrypt_remove_signer_btn',
  'encrypt_text_encryption_btn',
  'encrypt_encrypted_for_label',
  'encrypt_encrypted_files_label',
  'encrypt_signed_as_label',
  'encrypt_change_signer_dialog_title',
  'encrypt_change_signer_dialog_signer_label',
  'encrypt_file_error_header',
  'encrypt_text_error_header'
]);

export default class Encrypt extends React.Component {
  constructor() {
    super();
    this.state = {
      initializing: true,
      waiting: false,
      encryptDisabled: true,
      keyringId: '',
      keys: [],
      recipients: [],
      autoLocate: false,
      signingKey: null,
      selectedSigningKeyFpr: null,
      signingKeys: [],
      signMsg: false,
      showSigningKeyModal: false,
      files: [],
      showTextInput: false,
      message: '',
      defaultPlainText: '',
      encrypted: [],
      notifications: []
    };
    this.handleChangeSigningKey = this.handleChangeSigningKey.bind(this);
    this.handleDownloadAll = this.handleDownloadAll.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
  }

  componentDidMount() {
    this.init();
    this.fileUpload = new fileLib.FileUpload();
  }

  async init() {
    await this.initKeys();
    const keyringId = await port.send('get-active-keyring');
    const defaultKeyFpr = await port.send('get-default-key-fpr', {keyringId});
    const {general} = await port.send('get-prefs');
    this.setState(prevState => ({
      keyringId,
      defaultKeyFpr,
      signingKey: general.auto_sign_msg ? prevState.keys.find(key => key.fingerprint === defaultKeyFpr) : null,
      initializing: false
    }));
  }

  async initKeys() {
    const keys = await port.send('get-all-key-data');
    this.setState({keys});
  }

  async handleAutoLocate({email}) {
    await port.send('auto-locate', {email, keyringId: this.state.keyringId});
    await this.initKeys();
  }

  async handleEncrypt() {
    this.setState(prevState => ({defaultPlainText: prevState.message, waiting: true}));
    if (this.state.files.length > 0) {
      await this.encryptFiles(this.state.files, this.state.recipients);
    }
    if (this.state.message !== '') {
      await this.encryptMessage(this.state.message, this.state.recipients);
    }
    this.setState({waiting: false});
  }

  handleBack() {
    this.setState(prevState => ({encrypted: [], recipients: [...prevState.recipients]}));
  }

  setErrorNotification(error, filename = '', source = 'encrypt') {
    const notification = {id: Date.now(), type: 'error', message: error.message};
    if (source === 'encrypt') {
      notification.header = filename ? l10n.get('encrypt_file_error_header', [filename]) : l10n.map.encrypt_text_error_header;
    } else {
      notification.header = l10n.get('encrypt_upload_file_error', [filename]);
    }
    this.setState(prevState => ({notifications: [...prevState.notifications, notification]}));
  }

  async encryptMessage(message, recipients) {
    try {
      const encrypted = await port.send('encrypt-message', {
        data: message,
        keyringId: this.state.keyringId,
        encryptionKeyFprs: recipients.map(r => r.fingerprint),
        signingKeyFpr: this.state.signingKey ? this.state.signingKey.fingerprint : '',
        uiLogSource: 'security_log_encrypt_ui',
        noCache: false,
        armor: true
      });
      this.setState(prevState => ({encrypted: [...prevState.encrypted, this.createFileObject({content: encrypted, filename: 'text.txt', mimeType: 'text/plain'})]}));
    } catch (error) {
      this.setErrorNotification(error);
    }
  }

  encryptFiles(plainFiles, recipients) {
    return Promise.all(plainFiles.map(async plainFile => {
      try {
        const fileExt = fileLib.extractFileExtension(plainFile.name);
        const encrypted = await port.send('encrypt-file', {
          plainFile,
          keyringId: this.state.keyringId,
          encryptionKeyFprs: recipients.map(r => r.fingerprint),
          signingKeyFpr: this.state.signingKey ? this.state.signingKey.fingerprint : '',
          uiLogSource: 'security_log_encrypt_ui',
          noCache: false,
          armor: fileExt === 'txt'
        });
        this.setState(prevState => ({encrypted: [...prevState.encrypted, this.createFileObject({content: encrypted, filename: plainFile.name, mimeType: 'application/octet-stream'})]}));
      } catch (error) {
        this.setErrorNotification(error, plainFile.name);
      }
    }));
  }

  createFileObject({content, filename, mimeType}) {
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    mimeType = 'application/octet-stream';
    const file = {id: getHash()};
    if (fileLib.extractFileExtension(filename) === 'txt') {
      file.name = `${filename}.asc`;
      file.content = content;
    } else {
      file.name = `${filename}.gpg`;
    }
    const blob = new Blob([str2ab(content)], {type: mimeType});
    file.objectURL = window.URL.createObjectURL(blob);
    return file;
  }

  async handleChangeSigningKey() {
    const signingKeys = await port.send('get-signing-keys', {keyringId: this.state.keyringId});
    this.setState(prevState => ({
      signingKeys,
      selectedSigningKeyFpr: prevState.signingKey ? prevState.signingKey.fingerprint : prevState.defaultKeyFpr,
      showSigningKeyModal: true
    }));
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
        <div className="encrypt jumbotron">
          <section className="card">
            <div className="card-body">
              {this.state.initializing ? (
                <Spinner delay={0} />
              ) : (
                <>
                  {this.state.encrypted.length > 0 &&
                    <nav aria-label="breadcrumb">
                      <ol className="breadcrumb bg-transparent p-0">
                        <li className="breadcrumb-item"><a onClick={() => this.handleBack()}><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.encrypt_header}</a></li>
                      </ol>
                    </nav>
                  }
                  <div className="card-title d-flex flex-wrap align-items-center w-100">
                    <h1 className="flex-shrink-0">{!this.state.encrypted.length ? l10n.map.encrypt_header : l10n.map.encrypt_header_success}</h1>
                    <div className="ml-auto flex-shrink-0">
                      {!this.state.encrypted.length &&
                        <button type="button" disabled={this.state.recipients.length === 0 || (this.state.files.length === 0 && this.state.message === '')} onClick={() => this.handleEncrypt()} className="btn btn-primary">{l10n.map.editor_encrypt_button}</button>
                      }
                      {this.state.encrypted.length > 1 &&
                        <button type="button" onClick={this.handleDownloadAll} className="btn btn-primary">{l10n.map.encrypt_download_all_button}</button>
                      }
                    </div>
                  </div>
                  <div className={this.state.encrypted.length ? 'd-none' : ''}>
                    <div className="form-group">
                      <label>{l10n.map.editor_label_recipient}</label>
                      <RecipientInput keys={this.state.keys} recipients={this.state.recipients} autoLocate={this.state.autoLocate} encryptDisabled={this.state.encryptDisabled}
                        onChangeEncryptStatus={({encryptDisabled}) => this.setState({encryptDisabled})}
                        onAutoLocate={recipient => this.handleAutoLocate(recipient)}
                      />
                    </div>
                    <div className="form-group mb-5">
                      <Alert className="mb-0">
                        <div className="d-flex align-items-center">
                          <span className="flex-shrink-1 mr-4">{this.state.signingKey ? l10n.get('encrypt_signer_info', [this.state.signingKey.email]) : l10n.map.encrypt_no_signer_info}</span>
                          <div className="btn-bar flex-md-shrink-0 flex-grow-1">
                            <button type="button" onClick={this.handleChangeSigningKey} className="btn btn-secondary mb-md-0">{l10n.map.change_link}</button>
                            {this.state.signingKey && <button type="button" onClick={() => this.setState({signingKey: null})} className="btn btn-secondary mb-md-0">{l10n.map.encrypt_remove_signer_btn}</button>}
                          </div>
                        </div>
                      </Alert>
                    </div>
                    <div className="form-group mb-5">
                      <label>{l10n.map.editor_label_attachments}</label>
                      <FileUpload files={this.state.files} onRemoveFile={id => this.handleRemoveFile(id)} onChangeFileInput={files => this.handleAddFile(files)} />
                    </div>
                    <div className="form-group">
                      {!this.state.showTextInput ? (
                        <div className="d-flex justify-content-center">
                          <button type="button" onClick={() => this.setState({showTextInput: true})} className="btn btn-secondary">{l10n.map.encrypt_text_encryption_btn}</button>
                        </div>
                      ) : (
                        <>
                          <label>{l10n.map.editor_label_message}</label>
                          <div style={{margin: '-0.2rem'}}>
                            <div className="plain-text w-100 h-100 overflow-hidden">
                              <PlainText ref={node => this.plainText = node} defaultValue={this.state.defaultPlainText} onChange={() => this.setState({message: this.plainText.getValue()})} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={this.state.encrypted.length ? '' : 'd-none'}>
                    <dl className="row">
                      <dt className="col-sm-4 col-md-3 col-lg-2 mb-2 text-nowrap">{l10n.map.encrypt_encrypted_for_label}</dt>
                      <dd className="col-sm-8 col-md-9 col-lg-10">{(this.state.recipients.map(recipient => recipient.email)).join(', ')}</dd>
                      {this.state.signingKey && (
                        <>
                          <dt className="col-sm-4 col-md-3 col-lg-2 mb-2 text-nowrap">{l10n.map.encrypt_signed_as_label}</dt>
                          <dd className="col-sm-8 col-md-9 col-lg-10">{`${this.state.signingKey.name} (${this.state.signingKey.email})`}</dd>
                        </>
                      )}
                    </dl>
                    <div className="form-group mb-0">
                      <label>{l10n.map.encrypt_encrypted_files_label}</label>
                      <div ref={ref => this.fileDownloadElements = ref}>
                        <FileDownloadPanel className="d-inline-flex flex-column align-items-start" files={this.state.encrypted} onCopyToClipboard={this.handleCopyToClipboard} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {this.state.waiting && <Spinner delay={0} fullscreen={true} />}
          </section>
          <Modal isOpen={this.state.showSigningKeyModal} toggle={() => this.setState(prevState => ({showSigningKeyModal: !prevState.showSigningKeyModal}))} title={l10n.map.encrypt_change_signer_dialog_title} hideFooter={true}>
            <div>
              <div className="form-group">
                <label>{l10n.map.encrypt_change_signer_dialog_signer_label}</label>
                <select className="custom-select" value={this.state.selectedSigningKeyFpr ? this.state.selectedSigningKeyFpr : this.state.defaultKeyFpr} onChange={() => this.setState({selectedSigningKeyFpr: event.target.value})}>
                  {this.state.signingKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
                </select>
              </div>
              <div className="row btn-bar">
                <div className="col-6">
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showSigningKeyModal: false})}>{l10n.map.dialog_cancel_btn}</button>
                </div>
                <div className="col-6">
                  <button type="button" onClick={() => this.setState(prevState => ({signingKey: prevState.signingKeys.find(key => key.fingerprint === prevState.selectedSigningKeyFpr), showSigningKeyModal: false}))} className="btn btn-primary btn-block">{l10n.map.change_link}</button>
                </div>
              </div>
            </div>
          </Modal>
        </div>
        <Notifications items={!this.state.waiting ? this.state.notifications : []} />
      </>
    );
  }
}
