/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {encodeHTML, getHash, str2ab} from '../../lib/util';
import EventHandler from '../../lib/EventHandler';
import ContentSandbox from './components/ContentSandbox';
import {FileDownloadPanel} from '../util/FilePanel';
import SecurityBG from '../util/SecurityBG';
import Alert from '../util/Alert';
import Toast from '../util/Toast';
import Spinner from '../util/Spinner';
import Terminate from '../util/Terminate';

import './DecryptMessage.scss';

// register language strings
l10n.register([
  'alert_header_error',
  'decrypt_attachment_label',
  'decrypt_digital_signature',
  'decrypt_digital_signature_failure',
  'decrypt_digital_signature_null',
  'decrypt_show_message_btn',
  'decrypt_signer_label',
  'security_background_button_title'
]);

export default class DecryptMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      signer: null,
      showSig: false,
      waiting: true,
      files: [],
      error: null,
      showError: false,
      pwdDialog: null,
      terminate: false
    };
    this.port = EventHandler.connect(`dDialog-${this.props.id}`, this);
    this.registerEventListeners();
    // emit event to backend that editor has initialized
    this.port.emit('decrypt-message-init');
  }

  registerEventListeners() {
    this.port.on('decrypted-message', this.onDecryptedMessage);
    this.port.on('verified-message', this.onVerifiedMessage);
    this.port.on('add-decrypted-attachment', this.onDecryptedAttachment);
    this.port.on('signature-verification', this.onSignatureVerification);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('show-password-required', this.onShowPwdRequired);
    this.port.on('show-pwd-dialog', this.onShowPwdDialog);
    this.port.on('hide-pwd-dialog', this.onHidePwdDialog);
    this.port.on('terminate', this.onTerminate);
  }

  onTerminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  onShowPwdDialog(msg) {
    this.setState({pwdDialog: msg, error: null});
  }

  onHidePwdDialog() {
    this.setState({pwdDialog: null});
  }

  onShowPwdRequired() {
    this.setState({waiting: false});
  }

  onVerifiedMessage(msg) {
    this.onSignatureVerification(msg);
    this.setState({message: encodeHTML(msg.message), waiting: false});
  }

  onDecryptedMessage({message}) {
    this.setState({message, waiting: false});
  }

  onDecryptedAttachment({attachment}) {
    const file = {
      id: getHash(),
      name: attachment.filename
    };
    const content = str2ab(attachment.content);
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    attachment.mimeType = 'application/octet-stream';
    const blob = new Blob([content], {type: attachment.mimeType});
    file.objectURL = window.URL.createObjectURL(blob);
    this.setState(prevState => ({
      files: [...prevState.files, file],
      waiting: false
    }));
  }

  onSignatureVerification({signers}) {
    let signer = null;
    if (!signers.length) {
      return this.setState({signer});
    }
    const validSig = signers.filter(signer => signer.valid === true);
    const invalidSig = signers.filter(signer => signer.valid === false);
    if (validSig.length) {
      signer = validSig[0];
    } else if (invalidSig.length) {
      signer = invalidSig[0];
    }
    this.setState({signer});
  }

  handleClickFile() {
    this.logUserInput('security_log_attachment_download');
  }

  showErrorMsg({error}) {
    this.setState({
      error: {
        header: l10n.map.alert_header_error,
        message: error,
        type: 'danger'
      },
      waiting: false,
      showError: true
    });
  }

  logUserInput(type) {
    this.port.emit('decrypt-inline-user-input', {
      source: 'security_log_email_viewer',
      type
    });
  }

  handleCancel() {
    this.port.emit('decrypt-dialog-cancel');
    this.setState({showError: false});
  }

  handleDecrypt() {
    this.setState({waiting: true}, () => this.port.emit('decrypt-message'));
  }

  signatureStatus() {
    let labelClass;
    let labelText;
    if (!this.state.signer) {
      return null;
    }
    switch (this.state.signer.valid) {
      case true:
        labelClass = 'success';
        labelText = l10n.map.decrypt_digital_signature;
        break;
      case false:
        labelClass = 'danger';
        labelText = l10n.map.decrypt_digital_signature_failure;
        break;
      default:
        labelClass = 'warning';
        labelText = l10n.map.decrypt_digital_signature_null;
    }
    return (
      <span className={`${labelClass} text-nowrap`}><span className={`icon icon-marker text-${labelClass}`} aria-hidden="true"></span> {labelText}</span>
    );
  }

  render() {
    return (
      <SecurityBG className={`decrypt-msg ${this.props.embedded ? 'embedded' : ''}`} port={this.port}>
        <div className="modal d-block" style={{zIndex: 1035}}>
          <div className="modal-dialog h-100 mw-100 m-0">
            {!this.state.message ? (
              <div className="pwdLock modal-content overflow-hidden shadow-lg border-0 h-100">
                <img src="../../img/Mailvelope/logo_signet.svg" />
                {this.state.waiting ? (
                  <Spinner />
                ) : (
                  <button type="button" onClick={() => this.handleDecrypt()} className="btn btn-primary" disabled={this.state.showError}>{l10n.map.decrypt_show_message_btn}</button>
                )}
              </div>
            ) : (
              <div className="modal-content overflow-hidden shadow-lg border-0 h-100">
                {this.state.signer && (
                  <div className="modal-header flex-column border-0 flex-shrink-0">
                    <div className="signature d-flex align-items-center justify-content-start flex-wrap w-100">
                      <label className="mb-0 mr-3">{l10n.map.decrypt_signer_label}</label>
                      <Alert type="info" className="my-2 mr-auto flex-shrink-1">
                        <span className="icon icon-key" style={{fontSize: '1.25rem'}}></span>
                        <strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}> #${this.state.signer.keyId ? this.state.signer.keyId.toUpperCase() : this.state.signer.keyDetails.keyId.toUpperCase()}`}
                      </Alert>
                      {this.signatureStatus()}
                    </div>
                    {this.props.embedded && this.state.files.length > 0  && (
                      <div className="files d-flex justify-content-start align-items-center">
                        <label className="mb-0 mr-3 mb-3">{l10n.map.decrypt_attachment_label}</label>
                        <FileDownloadPanel files={this.state.files} onClickFile={() => this.handleClickFile()} />
                      </div>
                    )}
                  </div>
                )}
                <div className="modal-body overflow-auto">
                  <div className="plain-text w-100 h-100">
                    <ContentSandbox value={this.state.message} />
                  </div>
                </div>
                {!this.props.embedded && this.state.files.length > 0  && (
                  <div className="modal-footer justify-content-start flex-shrink-0">
                    <label className="mb-0 mr-3 mb-3">{l10n.map.decrypt_attachment_label}</label>
                    <FileDownloadPanel files={this.state.files} onClickFile={() => this.handleClickFile()} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {this.state.pwdDialog && <iframe className="decrypt-popup-pwd-dialog modal-content" src={`../enter-password/passwordDialog.html?id=${this.state.pwdDialog.id}`} frameBorder={0} />}
        {this.state.error &&
          <div className="toastWrapper">
            <Toast isOpen={this.state.showError} header={this.state.error.header} toggle={() => this.setState(prevState => ({showError: !prevState.showError}))} type="error" transition={{timeout: 150, unmountOnExit: true, onExited: () => this.handleCancel()}}>
              {this.state.error.message}
            </Toast>
          </div>
        }
        {this.state.pwdDialog && <div className="modal-backdrop show"></div>}
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

DecryptMessage.propTypes = {
  id: PropTypes.string,
  embedded: PropTypes.bool
};
