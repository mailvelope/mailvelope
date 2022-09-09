/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview This file implements the interface for encrypting and
 * signing user data in an sandboxed environment that is secured from
 * the webmail interface.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Fade} from 'reactstrap';
import * as l10n from '../../lib/l10n';
import {str2ab} from '../../lib/util';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import EventHandler from '../../lib/EventHandler';
import PlainText from './components/PlainText';
import EditorModalFooter from './components/EditorModalFooter';
import {RecipientInput} from './components/RecipientInput';
import BlurWarning from './components/BlurWarning';
import SecurityBG from '../util/SecurityBG';
import FileUpload from '../util/FileUpload';
import Toast from '../util/Toast';
import Spinner from '../util/Spinner';
import Terminate from '../util/Terminate';

import * as fileLib from '../../lib/file';

import './editor.scss';

// register language strings
l10n.register([
  'editor_error_header',
  'editor_header',
  'editor_label_attachments',
  'editor_label_copy_recipient',
  'editor_label_message',
  'editor_label_recipient',
  'editor_label_subject',
  'form_ok',
  'upload_quota_exceeded_warning',
  'upload_quota_warning_headline',
  'waiting_dialog_decryption_failed'
]);

export default class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      defaultKey: false,
      defaultPlainText: '',
      embedded: false,
      encryptDisabled: true,
      extraKey: false,
      extraKeys: [],
      extraKeysError: false,
      files: [],
      hasUserInput: false,
      integration: false,
      notification: null,
      plainText: '',
      privKeys: [],
      publicKeys: [],
      pwdDialog: null,
      recipients: [],
      recipientsError: false,
      recipientsCc: [],
      recipientsCcError: false,
      showNotification: false,
      showRecipientsCc: false,
      signKey: '',
      signMsg: false,
      subject: '',
      terminate: false,
      waiting: true
    };
    this.encryptTimeout = null;
    this.port = EventHandler.connect(`editor-${this.props.id}`, this);
    // flag to control time slice for input logging
    this.logTextareaInput = true;
    this.registerEventListeners();
    // ref to blur warning
    this.blurWarning = null;
  }

  componentDidMount() {
    this.port.emit('editor-mount');
  }

  registerEventListeners() {
    this.port.on('set-text', ({text}) => this.setState({defaultPlainText: text, plainText: text}));
    this.port.on('set-init-data', this.onSetInitData);
    this.port.on('set-mode', this.onSetMode);
    this.port.on('set-attachment', this.onSetAttachment);
    this.port.on('decrypt-in-progress', this.showSpinner);
    this.port.on('encrypt-in-progress', this.onEncryptInProgress);
    this.port.on('send-mail-in-progress', this.showSpinner);
    this.port.on('decrypt-end', this.hideSpinner);
    this.port.on('encrypt-end', this.hideSpinner);
    this.port.on('encrypt-failed', this.hideSpinner);
    this.port.on('decrypt-failed', this.onDecryptFailed);
    this.port.on('show-pwd-dialog', this.onShowPwdDialog);
    this.port.on('hide-pwd-dialog', this.onHidePwdDialog);
    this.port.on('get-plaintext', this.getPlaintext);
    this.port.on('error-message', this.onErrorMessage);
    this.port.on('hide-notification', this.hideNotification);
    this.port.on('show-notification', this.showNotification);
    this.port.on('terminate', this.onTerminate);
    this.port.on('public-key-userids', this.onPublicKeyUserids);
    this.port.on('key-update', this.onKeyUpdate);
  }

  onSetInitData({text = '', signMsg, subject, defaultKeyFpr, privKeys = []}) {
    this.setState({
      defaultPlainText: text,
      plainText: text,
      subject,
      files: [],
      signMsg: Boolean(signMsg),
      signKey: defaultKeyFpr,
      defaultKey: Boolean(defaultKeyFpr),
      privKeys
    });
  }

  onSetMode({event, ...modes}) {
    if (Object.entries(modes).some(entry => entry[1])) {
      this.fileUpload = new fileLib.FileUpload();
    }
    this.setState({...modes});
  }

  onTerminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  handlePlainTextLoad() {
    // emit event to backend that editor has initialized
    this.setState({waiting: false}, () => this.port.emit('editor-load'));
  }

  /**
   * Remember the available public keys for later and set the recipients proposal gotten from the webmail ui to the editor
   * @param {Array} options.keys         A list of all available public keys from the local keychain
   * @param {Array} options.recipients   recipients gather from the webmail ui
   */
  onPublicKeyUserids({keys, to, cc}) {
    this.setState({publicKeys: keys, recipients: to, recipientsCc: cc, showRecipientsCc: cc.length > 0});
  }

  /**
   * Event that is triggered after update of the public keyring (e.g. when the key server responded)
   * @param {Array} options.keys   A list of all available public keys from the local keychain
   */
  onKeyUpdate({keys}) {
    this.setState({publicKeys: keys});
  }

  onEncryptInProgress() {
    if (!this.encryptTimeout) {
      this.encryptTimeout = setTimeout(() => {
        this.showSpinner();
      }, 300);
    }
  }

  showSpinner() {
    this.setState(prevState => ({waiting: !prevState.showNotification}));
  }

  hideSpinner() {
    clearTimeout(this.encryptTimeout);
    this.encryptTimeout = null;
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
    this.port.emit('editor-close', {cancel: true});
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
  handleOk() {
    this.logUserInput('security_log_dialog_encrypt');
    this.setState({encryptDisabled: true}, () => this.sendPlainText('encrypt'));
  }

  getPlaintext(msg) {
    if (this.fileUpload && this.fileUpload.inProgress()) {
      this.fileUpload.registerAction(() => this.getPlaintext(msg));
      return;
    }
    // don't use key cache when sign & encrypt of message and user has not touched the editor
    // otherwise any predefinedText could be signed with the client-API
    const noCache = this.state.embedded && !msg.draft && !this.state.hasUserInput;
    this.sendPlainText(msg.action, noCache, msg.draft);
  }

  /**
   * Send the plaintext body to the background script for either signing or encryption.
   * @param  {String} action   Either 'sign' or 'encrypt'
   */
  sendPlainText(action, noCache, draft) {
    this.port.emit('editor-plaintext', {
      message: this.state.plainText,
      subject: this.state.subject,
      keysTo: this.state.recipients.map(r => r.key || {email: r.email}), // return email if key not available (action: 'sign')
      keysCc: this.state.recipientsCc.map(r => r.key || {email: r.email}), // return email if key not available (action: 'sign')
      keysEx: this.state.extraKeys.map(r => r.key || {email: r.email}), // return email if key not available (action: 'sign')
      attachments: this.state.files,
      action,
      signMsg: this.state.signMsg || draft, // draft is always signed
      signKeyFpr: this.state.signKey,
      noCache
    });
  }

  handleTextChange(value) {
    this.setState({plainText: value});
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

  showNotification({title: header = '', message, type, autoHide = true, hideDelay = 4000, closeOnHide = false, dismissable = true}) {
    this.setState({
      notification: {
        header,
        message,
        type,
        autoHide,
        hideDelay,
        closeOnHide,
        dismissable
      },
      waiting: false,
      pwdDialog: null,
      showNotification: true
    });
  }

  onDecryptFailed(msg) {
    const error = {
      title: l10n.map.waiting_dialog_decryption_failed,
      message: (msg.error) ? msg.error.message : l10n.map.waiting_dialog_decryption_failed,
      type: 'error'
    };
    this.showNotification(error);
  }

  onErrorMessage(msg) {
    if (msg.error.code === 'PWD_DIALOG_CANCEL') {
      return;
    }
    msg.error.type = 'error';
    msg.error.title = msg.error.title || l10n.map.editor_error_header;
    this.showNotification(msg.error);
  }

  onShowPwdDialog(msg) {
    this.setState({pwdDialog: msg, waiting: false, notification: null});
  }

  onHidePwdDialog() {
    this.setState({pwdDialog: null});
  }

  handleAddAttachment(files) {
    files = Array.from(files);
    const filesSize = files.reduce((total, file) => total + file.size, 0);
    const uploadedSize = this.state.files.reduce((total, file) => total + file.size, 0);
    const currentAttachmentsSize = uploadedSize + filesSize;
    if (currentAttachmentsSize > this.props.maxFileUploadSize) {
      const error = {
        title: l10n.map.upload_quota_warning_headline,
        message: `${l10n.map.upload_quota_exceeded_warning} ${Math.floor(this.props.maxFileUploadSize / (1024 * 1024))}MB.`
      };
      this.showNotification(error);
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

  handleChangeSignKey(value) {
    if (value === 'nosign') {
      this.setState({signMsg: false});
    } else {
      this.setState({signKey: value, signMsg: true});
    }
  }

  handleCheck(event) {
    const target = event.target;
    this.setState({[target.name]: target.checked});
  }

  handleKeyLookup(recipient) {
    this.port.emit('key-lookup', {recipient});
  }

  hideNotification(timeout = 0, closeEditor = false) {
    setTimeout(() => {
      if (closeEditor) {
        this.port.emit('editor-close');
      } else {
        this.setState({showNotification: false, notification: null});
      }
    }, timeout);
  }

  handleChangeRecipient(error) {
    this.setState(prevState => {
      const errorState = {recipientsError: prevState.recipientsError, recipientsCcError: prevState.recipientsCcError, ...error};
      return {...errorState, encryptDisabled: errorState.recipientsError || errorState.recipientsCcError || !prevState.recipients.length};
    });
  }

  handleChangeExtraKeyInput({hasError}) {
    this.setState({extraKeysError: hasError});
  }

  onNotificationEnteredTransition() {
    if (this.blurWarning) {
      this.blurWarning.startBlurValid();
    }
    if (this.state.notification.autoHide) {
      this.hideNotification(this.state.notification.hideDelay, this.state.notification.closeOnHide);
    }
  }

  render() {
    const hasExtraKey = Boolean(this.state.extraKey && this.state.extraKeys.length && !this.state.extraKeysError);
    return (
      <SecurityBG className={`editor ${this.state.embedded ? 'embedded' : ''}`} port={this.port}>
        <div className="modal d-block">
          <div className="modal-dialog h-100 mw-100 m-0">
            <div className="modal-content shadow-lg overflow-auto border-0 h-100">
              <div className="modal-body">
                <div className="editor d-flex flex-column align-content-center h-100">
                  {!this.state.embedded && (
                    <div className="mb-3">
                      <div className="d-flex">
                        <label className="mr-auto">{l10n.map.editor_label_recipient}</label>
                        {(!this.state.showRecipientsCc && this.state.integration) && <label><a href="#" role="button" className="text-reset" onClick={() => this.setState({showRecipientsCc: true})}>{l10n.map.editor_label_copy_recipient}</a></label>}
                      </div>
                      <RecipientInput keys={this.state.publicKeys} recipients={this.state.recipients}
                        onChangeRecipient={({hasError}) => this.handleChangeRecipient({recipientsError: hasError})}
                        onAutoLocate={recipient => this.handleKeyLookup(recipient)}
                        extraKey={hasExtraKey}
                      />
                    </div>
                  )}
                  {this.state.showRecipientsCc && (
                    <div className="mb-3">
                      <label className="mr-auto">{l10n.map.editor_label_copy_recipient}</label>
                      <RecipientInput keys={this.state.publicKeys} recipients={this.state.recipientsCc}
                        onChangeRecipient={({hasError}) => this.handleChangeRecipient({recipientsCcError: hasError})}
                        onAutoLocate={recipient => this.handleKeyLookup(recipient)}
                        extraKey={hasExtraKey}
                      />
                    </div>
                  )}
                  {this.state.integration && (
                    <div className="mb-3">
                      <label>{l10n.map.editor_label_subject}</label>
                      <input type="text" value={this.state.subject} className="form-control" id="subject" onChange={e => this.setState({subject: e.target.value})} />
                    </div>
                  )}
                  <div className="editor-body d-flex flex-column flex-grow-1">
                    <label>{l10n.map.editor_label_message}</label>
                    <div className="flex-grow-1" style={{margin: '-0.2rem'}}>
                      <div className="plain-text w-100 h-100">
                        <PlainText defaultValue={this.state.defaultPlainText} onChange={value => this.handleTextChange(value)}
                          onBlur={() => this.blurWarning && this.blurWarning.onBlur()} onMouseUp={element => this.handleTextMouseUp(element)} onLoad={() => this.handlePlainTextLoad()}
                        />
                      </div>
                    </div>
                  </div>
                  {(this.state.embedded || this.state.integration) && (
                    <div className="mt-3">
                      <label>{l10n.map.editor_label_attachments}</label>
                      <FileUpload files={this.state.files} onClickUpload={() => this.logUserInput('security_log_add_attachment')} onRemoveFile={id => this.handleRemoveFile(id)} onChangeFileInput={files => this.handleAddAttachment(files)} />
                    </div>
                  )}
                </div>
              </div>
              {!this.state.embedded && (
                <div className="modal-footer px-4 pb-4 pt-2 flex-shrink-0">
                  <EditorModalFooter signMsg={this.state.signMsg} signKey={this.state.signKey}
                    extraKey={this.state.extraKey}
                    extraKeyInput={
                      <RecipientInput keys={this.state.publicKeys} recipients={this.state.extraKeys} onAutoLocate={recipient => this.handleKeyLookup(recipient)} hideErrorMsg={true}
                        onChangeRecipient={error => this.handleChangeExtraKeyInput(error)}
                      />}
                    integration = {this.state.integration}
                    onCancel={() => this.handleCancel()}
                    onChangeSignKey={value => this.handleChangeSignKey(value)}
                    onClickSignSetting={() => this.port.emit('open-app', {fragment: '/settings/general'})}
                    onExtraKey={event => this.handleCheck(event)}
                    onOk={() => this.handleOk()}
                    onSignOnly={() => this.handleSign()}
                    privKeys={this.state.privKeys} encryptDisabled={this.state.encryptDisabled || this.state.plainText === ''}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {!this.state.embedded && <BlurWarning ref={node => this.blurWarning = node} />}
        {this.state.pwdDialog && <iframe className="editor-popup-pwd-dialog modal-content" src={`../enter-password/passwordDialog.html?id=${this.state.pwdDialog.id}`} frameBorder={0} />}
        {this.state.notification &&
          <div className="toastWrapper">
            <Toast isOpen={this.state.showNotification} header={this.state.notification.header} toggle={this.state.notification.dismissable ? () => this.hideNotification() : undefined} type={this.state.notification.type} transition={{timeout: 150, unmountOnExit: true, onEntered: () => this.onNotificationEnteredTransition()}}>
              {this.state.notification.message}
            </Toast>
          </div>
        }
        <Fade in={this.state.pwdDialog !== null || (this.state.showNotification && !this.state.notification.dismissable)} unmountOnExit={true} className="modal-backdrop" />
        {this.state.waiting && <Spinner fullscreen={true} delay={0} />}
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

Editor.propTypes = {
  id: PropTypes.string,
  maxFileUploadSize: PropTypes.number
};

Editor.defaultProps = {
  maxFileUploadSize: MAX_FILE_UPLOAD_SIZE,
};
