/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This file implements the interface for encrypting and
 * signing user data in an sandboxed environment that is secured from
 * the webmail interface.
 */

import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import * as l10n from '../../lib/l10n';
import {showSecurityBackground, str2ab, terminate} from '../../lib/util';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import EventHandler from '../../lib/EventHandler';
import PlainText from './components/PlainText';
import {FileUploadPanel} from '../util/FilePanel';
import EditorFooter from './components/EditorFooter';
import EditorModalFooter from './components/EditorModalFooter';
import {RecipientInput} from './components/RecipientInput';
import BlurWarning from './components/BlurWarning';
import ModalDialog from '../util/ModalDialog';
import Alert from '../util/Alert';
import Spinner from '../util/Spinner';

import * as fileLib from '../../lib/file';

import './editor.css';

// register language strings
l10n.register([
  'waiting_dialog_decryption_failed',
  'upload_quota_exceeded_warning',
  'editor_error_header',
  'waiting_dialog_prepare_email',
  'upload_quota_warning_headline',
  'security_background_button_title',
  'editor_header',
  'form_ok'
]);

export default class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasUserInput: false,
      signMsg: false,
      signKey: '',
      defaultKey: false,
      privKeys: [],
      optionsExpanded: false,
      defaultPlainText: '',
      publicKeys: [],
      recipients: [],
      encryptDisabled: true,
      waiting: false,
      error: null,
      pwdDialog: null,
      files: []
    };
    this.port = EventHandler.connect(`editor-${this.props.id}`, this);
    // flag to control time slice for input logging
    this.logTextareaInput = true;
    this.registerEventListeners();
    // ref to PlainText component
    this.plainText = null;
    // ref to blur warning
    this.blurWarning = null;
  }

  componentDidMount() {
    if (this.props.secureBackground) {
      showSecurityBackground(this.port, this.props.embedded);
    }
    if (this.props.embedded) {
      this.fileUpload = new fileLib.FileUpload();
    } else {
      // keep initial bottom position of body
      this.modalBodyBottomPosition = $('.m-modal .modal-body').css('bottom');
    }
  }

  registerEventListeners() {
    this.port.on('set-text', ({text}) => this.setState({defaultPlainText: text}));
    this.port.on('set-init-data', this.onSetInitData);
    this.port.on('set-attachment', this.onSetAttachment);
    this.port.on('decrypt-in-progress', this.showWaitingModal);
    this.port.on('encrypt-in-progress', this.showWaitingModal);
    this.port.on('decrypt-end', this.hideWaitingModal);
    this.port.on('encrypt-end', this.hideWaitingModal);
    this.port.on('encrypt-failed', this.hideWaitingModal);
    this.port.on('decrypt-failed', this.onDecryptFailed);
    this.port.on('show-pwd-dialog', this.onShowPwdDialog);
    this.port.on('hide-pwd-dialog', this.onHidePwdDialog);
    this.port.on('get-plaintext', this.getPlaintext);
    this.port.on('error-message', this.onErrorMessage);
    this.port.on('terminate', () => terminate(this.port));
    this.port.on('public-key-userids', this.onPublicKeyUserids);
    this.port.on('key-update', this.onKeyUpdate);
  }

  onSetInitData({text = '', signMsg, defaultKeyFpr, privKeys = []}) {
    this.setState({
      defaultPlainText: text,
      signMsg: Boolean(signMsg),
      signKey: defaultKeyFpr,
      defaultKey: Boolean(defaultKeyFpr),
      privKeys
    });
  }

  handlePlainTextLoad() {
    // emit event to backend that editor has initialized
    this.port.emit('editor-init');
  }

  /**
   * Remember the available public keys for later and set the recipients proposal gotten from the webmail ui to the editor
   * @param {Array} options.keys         A list of all available public keys from the local keychain
   * @param {Array} options.recipients   recipients gather from the webmail ui
   */
  onPublicKeyUserids({keys, recipients}) {
    this.setState({publicKeys: keys, recipients});
  }

  /**
   * Event that is triggered after update of the public keyring (e.g. when the key server responded)
   * @param {Array} options.keys   A list of all available public keys from the local keychain
   */
  onKeyUpdate({keys}) {
    this.setState({publicKeys: keys});
  }

  showWaitingModal() {
    this.setState({waiting: true});
  }

  hideWaitingModal() {
    this.setState({waiting: false});
  }

  /**
   * send log entry for user input
   * @param {string} type
   */
  logUserInput(type) {
    this.setState({hasUserInput: true});
    this.port.emit('editor-user-input', {
      source: 'security_log_editor',
      type
    });
  }

  /**
   * Is called when the user clicks the cancel button.
   */
  handleCancel() {
    this.logUserInput('security_log_dialog_cancel');
    this.port.emit('editor-cancel');
  }

  /**
   * Is called when the user clicks the sign button.
   */
  handleSign() {
    this.logUserInput('security_log_dialog_sign');
    this.port.emit('sign-only', {
      signKeyFpr: this.state.signKey
    });
  }

  /**
   * Is called when the user clicks the encrypt button.
   */
  handleEncrypt() {
    this.logUserInput('security_log_dialog_encrypt');
    this.sendPlainText('encrypt');
  }

  getPlaintext(msg) {
    if (this.fileUpload && this.fileUpload.inProgress()) {
      this.fileUpload.registerAction(() => this.getPlaintext(msg));
      return;
    }
    // don't use key cache when sign & encrypt of message and user has not touched the editor
    // otherwise any predefinedText could be signed with the client-API
    const noCache = this.props.embedded && !msg.draft && !this.state.hasUserInput;
    this.sendPlainText(msg.action, noCache, msg.draft);
  }

  /**
   * Send the plaintext body to the background script for either signing or encryption.
   * @param  {String} action   Either 'sign' or 'encrypt'
   */
  sendPlainText(action, noCache, draft) {
    this.port.emit('editor-plaintext', {
      message: this.plainText.getValue(),
      keys: this.state.recipients.map(r => r.key || {email: r.email}), // return email if key not available (action: 'sign')
      attachments: this.state.files,
      action,
      signMsg: this.state.signMsg || draft, // draft is always signed
      signKeyFpr: this.state.signKey,
      noCache
    });
  }

  handleTextChange() {
    this.blurWarning && this.blurWarning.startBlurWarnInterval();
    this.logTextInput();
  }

  logTextInput() {
    if (this.logTextareaInput) {
      this.logUserInput('security_log_textarea_input');
      // limit textarea log to 1 event per second
      this.logTextareaInput = false;
      window.setTimeout(() => {
        this.logTextareaInput = true;
      }, 1000);
    }
  }

  handleTextMouseUp(event) {
    const textElement = event.currentTarget;
    if (textElement.selectionStart === textElement.selectionEnd) {
      this.logUserInput('security_log_textarea_click');
    } else {
      this.logUserInput('security_log_textarea_select');
    }
  }

  handleOptionsExpand() {
    $('.m-modal .modal-body').animate({bottom: '172px'}, () => {
      this.setState({optionsExpanded: true});
    });
  }

  handleOptionsCollapse() {
    $('.m-modal .modal-body').animate({bottom: this.modalBodyBottomPosition});
    this.setState({optionsExpanded: false});
  }

  showErrorModal(error) {
    this.setState({
      error: {
        header: error.title || l10n.map.editor_error_header,
        message: error.message,
        type: 'danger'
      },
      waiting: false,
      pwdDialog: null
    });
  }

  onDecryptFailed(msg) {
    const error = {
      title: l10n.map.waiting_dialog_decryption_failed,
      message: (msg.error) ? msg.error.message : l10n.map.waiting_dialog_decryption_failed,
      type: 'danger'
    };
    this.showErrorModal(error);
  }

  onErrorMessage(msg) {
    if (msg.error.code === 'PWD_DIALOG_CANCEL') {
      return;
    }
    this.showErrorModal(msg.error);
  }

  onShowPwdDialog(msg) {
    this.setState({pwdDialog: msg, waiting: false, error: null});
  }

  onHidePwdDialog() {
    this.setState({pwdDialog: null});
  }

  handleAddAttachment(evt) {
    const files = Array.from(evt.target.files);
    const filesSize = files.reduce((total, file) => total + file.size, 0);
    const uploadedSize = this.state.files.reduce((total, file) => total + file.size, 0);
    const currentAttachmentsSize = uploadedSize + filesSize;
    if (currentAttachmentsSize > this.props.maxFileUploadSize) {
      const error = {
        title: l10n.map.upload_quota_warning_headline,
        message: `${l10n.map.upload_quota_exceeded_warning} ${Math.floor(this.props.maxFileUploadSize / (1024 * 1024))}MB.`
      };
      this.showErrorModal(error);
      return;
    }
    files.forEach(file => this.addAttachment(file));
  }

  addAttachment(file) {
    if (fileLib.isOversize(file)) {
      throw new Error('File is too big');
    }
    this.fileUpload.readFile(file)
    .then(file => this.setState(prevState => ({files: [...prevState.files, file]})))
    .catch(error => console.log(error));
  }

  onSetAttachment({attachment}) {
    const buffer = str2ab(attachment.content);
    const blob = new Blob([buffer], {type: attachment.mimeType});
    const file = new File([blob], attachment.filename, {type: attachment.mimeType});
    this.addAttachment(file);
  }

  handleRemoveFile(id) {
    this.logUserInput('security_log_remove_attachment');
    this.setState(prevState => ({files: prevState.files.filter(file => file.id !== id)}));
  }

  editorBody() {
    return (
      <div style={{height: '100%'}}>
        <div className="editor-flex-container">
          <div className={`editor-header ${this.props.secureBackground || this.state.files.length ? '' : 'hide'}`}>
            {this.props.secureBackground &&
              <div className="button-bar">
                <button type="button" className="btn btn-link secureBgndSettingsBtn" title={l10n.map.security_background_button_title}
                  onClick={() => this.port.emit('open-security-settings')}>
                  <span className="glyphicon lockBtnIcon"></span>
                </button>
              </div>
            }
            <div className="upload-panel">
              <FileUploadPanel files={this.state.files} onRemoveFile={id => this.handleRemoveFile(id)} />
            </div>
          </div>
          {this.props.recipientInput &&
            <div className="editor-recipients">
              <RecipientInput keys={this.state.publicKeys} recipients={this.state.recipients} encryptDisabled={this.state.encryptDisabled}
                onChangeEncryptStatus={({encryptDisabled}) => this.setState({encryptDisabled})}
                onAutoLocate={recipient => this.port.emit('auto-locate', {recipient})}
              />
            </div>
          }
          <div className="editor-body">
            <div className="plain-text">
              <PlainText defaultValue={this.state.defaultPlainText} onChange={() => this.handleTextChange()}
                onBlur={() => this.blurWarning && this.blurWarning.onBlur()} onMouseUp={element => this.handleTextMouseUp(element)} onLoad={() => this.handlePlainTextLoad()}
                ref={node => this.plainText = node}
              />
            </div>
          </div>
          <div className="editor-footer">
            <EditorFooter embedded={this.props.embedded} signMsg={this.state.signMsg} defaultKey={this.state.defaultKey}
              onClickUpload={() => this.logUserInput('security_log_add_attachment')}
              onChangeFileInput={e => this.handleAddAttachment(e)}
              onClickFileEncryption={() => this.port.emit('open-app', {fragment: '/encryption/file-encrypt'})}
            />
          </div>
        </div>
      </div>
    );
  }

  editorPopup() {
    return (
      <div>
        <div className={`m-modal ${this.state.pwdDialog ? 'hide' : ''}`}>
          <div className="modal-header clearfix">
            <h4>{l10n.map.editor_header}</h4>
          </div>
          <div className={`modal-body ${this.props.secureBackground ? 'secureBackground' : ''}`}>
            {this.editorBody()}
          </div>
          <div className="modal-footer">
            <EditorModalFooter expanded={this.state.optionsExpanded} signMsg={this.state.signMsg} signKey={this.state.signKey}
              privKeys={this.state.privKeys} encryptDisabled={this.state.encryptDisabled}
              onCancel={() => this.handleCancel()}
              onSignOnly={() => this.handleSign()}
              onEncrypt={() => this.handleEncrypt()}
              onExpand={() => this.handleOptionsExpand()}
              onCollapse={() => this.handleOptionsCollapse()}
              onChangeSignMsg={signMsg => this.setState({signMsg})}
              onChangeSignKey={signKey => this.setState({signKey})}
              onClickSignSetting={() => this.port.emit('open-app', {fragment: '/settings/general'})}
            />
          </div>
        </div>
        <BlurWarning ref={node => this.blurWarning = node} />
        {this.state.pwdDialog && <iframe className="editor-popup-pwd-dialog" src={`../enter-password/pwdDialog.html?id=${this.state.pwdDialog.id}`} frameBorder={0} />}
      </div>
    );
  }

  waitingModal() {
    if (!this.state.waiting) {
      return null;
    }
    return (
      <ModalDialog className="waiting-modal" hideHeader={true} hideFooter={true} keyboard={false} onShow={this.blurWarning && this.blurWarning.startBlurValid}>
        <div>
          <Spinner style={{margin: '10px auto'}} />
          <p className="text-center">{l10n.map.waiting_dialog_prepare_email}&hellip;</p>
        </div>
      </ModalDialog>
    );
  }

  errorModal() {
    if (!this.state.error) {
      return null;
    }
    return (
      <ModalDialog title={this.state.error.header} onShow={this.blurWarning && this.blurWarning.startBlurValid} footer={
        <button type="button" className="btn btn-primary" data-dismiss="modal">{l10n.map.form_ok}</button>
      }>
        <div style={{maxHeight: '120px', overflowX: 'scroll'}}>
          <Alert type={this.state.error.type}>{this.state.error.message}</Alert>
        </div>
      </ModalDialog>
    );
  }

  render() {
    return (
      <div style={{height: '100%'}}>
        {this.props.embedded ? (
          <div className={this.props.secureBackground ? 'secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
            {this.editorBody()}
          </div>
        ) : (
          this.editorPopup()
        )}
        {this.waitingModal()}
        {this.errorModal()}
      </div>
    );
  }
}

Editor.propTypes = {
  id: PropTypes.string,
  embedded: PropTypes.bool,
  maxFileUploadSize: PropTypes.number,
  recipientInput: PropTypes.bool,
  secureBackground: PropTypes.bool
};

Editor.defaultProps = {
  maxFileUploadSize: MAX_FILE_UPLOAD_SIZE,
  secureBackground: true
};
