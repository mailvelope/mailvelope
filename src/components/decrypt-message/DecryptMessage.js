/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {UncontrolledTooltip} from 'reactstrap';
import * as l10n from '../../lib/l10n';
import {LARGE_FRAME} from '../../lib/constants';
import {encodeHTML, getUUID, str2ab} from '../../lib/util';
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
  'alert_header_warning',
  'decrypt_attachment_label',
  'decrypt_cleartext_warning',
  'decrypt_digital_signature',
  'decrypt_digital_signature_failure',
  'decrypt_digital_signature_inconsistent',
  'decrypt_digital_signature_missing',
  'decrypt_digital_signature_null',
  'decrypt_digital_signature_null_info_short',
  'decrypt_digital_signature_sender_mismatch',
  'decrypt_digital_signature_sender_mismatch_tooltip',
  'decrypt_digital_signature_uncertain_sender',
  'decrypt_show_message_btn',
  'decrypt_signer_label',
  'keygrid_keyid'
]);

export default class DecryptMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: null,
      signer: null,
      showSig: false,
      waiting: true,
      locked: false,
      clearText: false,
      files: [],
      encFiles: [],
      notification: null,
      showNotification: false,
      pwdDialog: null,
      terminate: false,
      large: false
    };
    this.port = EventHandler.connect(`dDialog-${this.props.id}`, this);
    this.registerEventListeners();
    // emit event to backend that editor has initialized
    this.port.emit('decrypt-message-init');
  }

  componentDidMount() {
    this.setState({large: this.element.clientHeight > LARGE_FRAME ? true : false});
  }

  registerEventListeners() {
    this.port.on('decrypted-message', this.onDecryptedMessage);
    this.port.on('verified-message', this.onVerifiedMessage);
    this.port.on('add-decrypted-attachment', this.onDecryptedAttachment);
    this.port.on('signature-verification', this.onSignatureVerification);
    this.port.on('show-notification', this.showNotification);
    this.port.on('error-message', this.onErrorMessage);
    this.port.on('hide-error-message', () => this.hideNotification());
    this.port.on('lock', this.onLock);
    this.port.on('show-pwd-dialog', this.onShowPwdDialog);
    this.port.on('hide-pwd-dialog', this.onHidePwdDialog);
    this.port.on('terminate', this.onTerminate);
    this.port.on('set-enc-attachments', this.onEncAttachments);
    this.port.on('waiting', this.onWaiting);
  }

  onTerminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  onShowPwdDialog(msg) {
    this.setState({pwdDialog: msg, notification: null});
  }

  onHidePwdDialog() {
    this.setState({pwdDialog: null});
  }

  onLock() {
    this.setState({waiting: false, locked: true});
  }

  onWaiting({waiting, unlock = false}) {
    this.setState(prevState => ({
      waiting,
      locked: unlock ? false : prevState.locked
    }));
  }

  onVerifiedMessage({message, signers}) {
    this.onSignatureVerification({signers});
    this.onDecryptedMessage({message, clearText: true});
  }

  onDecryptedMessage({message, clearText}) {
    if (clearText) {
      message = `<pre style="color: inherit; font-size: inherit; white-space: pre-wrap;">${encodeHTML(message)}</pre>`;
    }
    this.setState({message, clearText});
  }

  onDecryptedAttachment({attachment}) {
    const file = {
      id: getUUID(),
      name: attachment.filename
    };
    const content = str2ab(attachment.content || attachment.data);
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    attachment.mimeType = 'application/octet-stream';
    const blob = new Blob([content], {type: attachment.mimeType});
    file.objectURL = window.URL.createObjectURL(blob);
    this.checkSignatureValiditiy(attachment.signatures, attachment.rootSignatures, file);
    this.setState(prevState => ({
      files: [...prevState.files, file],
      encFiles: prevState.encFiles.filter(({name}) => name !== attachment.encFileName),
      waiting: false
    }));
  }

  checkSignatureValiditiy(signatures, rootSignatures = [], file) {
    const validRootSig = rootSignatures.filter(sig => sig.valid)[0];
    if (!validRootSig) {
      return;
    }
    if (!signatures?.length) {
      file.signer = {type: 'warning', label: l10n.map.decrypt_digital_signature_missing};
      return;
    }
    const validSig = signatures.filter(sig => sig.valid)[0];
    const unknownSig = signatures.filter(sig => sig.valid === null)[0];
    const invalidSig = signatures.filter(sig => sig.valid === false)[0];
    if (validSig) {
      if (validRootSig.fingerprint !== validSig.fingerprint) {
        file.signer = {type: 'warning', label: l10n.map.decrypt_digital_signature_inconsistent};
      }
      return;
    }
    if (unknownSig) {
      file.signer = {type: 'warning', label: l10n.map.decrypt_digital_signature_null};
      return;
    }
    if (invalidSig) {
      file.signer = {type: 'danger', label: l10n.map.decrypt_digital_signature_failure};
    }
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
    } else {
      signer = signers[0];
    }
    this.setState({signer});
  }

  onEncAttachments({encAtts}) {
    this.setState({encFiles: encAtts.map((filename, index) => ({id: index, name: filename}))});
  }

  handleClickEncFile(e) {
    e.preventDefault();
    const fileName = e.currentTarget.getAttribute('download');
    this.setState({waiting: true}, () => this.port.emit('download-enc-attachment', {fileName}));
  }

  handleClickFile() {
    this.logUserInput('security_log_attachment_download');
  }

  showNotification({title: header = '', message, type, autoHide = true, hideDelay = 4000, dismissable = true}) {
    this.setState({
      notification: {
        header,
        message,
        type,
        autoHide,
        hideDelay,
        dismissable
      },
      waiting: false,
      pwdDialog: null,
      showNotification: true
    });
  }

  onErrorMessage(msg) {
    this.showNotification({
      type: 'error',
      title: l10n.map.editor_error_header,
      message: msg.error,
      autoHide: false
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
    this.setState({notification: null});
  }

  handleDecrypt() {
    if (!this.state.showNotification && !this.state.waiting) {
      if (this.state.message !== null && !this.state.clearText) {
        this.setState({locked: false});
      } else {
        this.port.emit('decrypt-message');
      }
    }
  }

  hideNotification(timeout = 0) {
    setTimeout(() => {
      this.setState({showNotification: false});
    }, timeout);
  }

  signerKeyId() {
    const {keyId, fingerprint} = this.state.signer;
    if (keyId) {
      return keyId.toUpperCase();
    }
    if (fingerprint) {
      return fingerprint.slice(-16).toUpperCase();
    }
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
      <div className={`signature d-flex align-items-center justify-content-start ${this.props.embedded ? '' : 'flex-wrap'} w-100`}>
        <span className={`${labelClass} text-nowrap mr-3 my-1`}><span className={`icon icon-marker text-${labelClass}`} aria-hidden="true"></span> {labelText}</span>
        <>
          <Alert type="info" className={`my-1 px-2 flex-shrink-1 ${this.props.embedded ? 'text-truncate' : ''}`}>
            <span id="SignatureDetails">
              {this.state.signer.valid !== null ? (
                <>
                  <span className="icon icon-key" style={{fontSize: '1.25rem'}}></span>
                  <strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}>`}
                  {!this.props.embedded && <span>{` #${this.state.signer.keyId ? this.state.signer.keyId.toUpperCase() : this.state.signer.keyDetails.keyId.toUpperCase()}`}</span>}
                </>
              ) : (
                <span>{l10n.map.decrypt_digital_signature_null_info_short}</span>
              )}
            </span>
            {this.state.signer.uncertainSender && <span className="ml-2"><a href="https://mailvelope.com/faq#uncertain_sender" target="_blank" rel="noreferrer">{l10n.map.decrypt_digital_signature_uncertain_sender}</a></span>}
          </Alert>
          {this.props.embedded &&
            <UncontrolledTooltip innerClassName="text-left" placement="auto-end" container={this.element.firstChild} target="SignatureDetails" autohide={false}>
              {this.state.signer.valid !== null ? (
                <span><strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}>`}<br /> {`${l10n.map.keygrid_keyid} #${this.state.signer.keyId ? this.state.signer.keyId.toUpperCase() : this.state.signer.keyDetails.keyId.toUpperCase()}`}</span>
              ) : (
                <span>{l10n.get('decrypt_digital_signature_null_info', [`#${this.signerKeyId()}`])}</span>
              )}
            </UncontrolledTooltip>
          }
          {this.state.signer.senderMismatch &&
            <Alert type="warning" id="SenderMismatch" className={`my-1 ml-3 px-2 flex-shrink-1 ${this.props.embedded ? 'text-truncate' : ''}`}>
              <span className="icon icon-error mr-1"></span>
              <strong>{l10n.map.decrypt_digital_signature_sender_mismatch}</strong>
              <UncontrolledTooltip innerClassName="text-left" placement="auto-end" container={this.element.firstChild} target="SenderMismatch" autohide={false}>
                <span> {l10n.map.decrypt_digital_signature_sender_mismatch_tooltip}</span>
              </UncontrolledTooltip>
            </Alert>
          }
        </>
      </div>
    );
  }

  render() {
    return (
      <SecurityBG className={`decrypt-msg ${this.props.embedded ? 'embedded' : ''}`} port={this.port}>
        <div className="modal d-block" style={{zIndex: 1035}}>
          <div ref={node => this.element = node} className="modal-dialog h-100 mw-100 m-0">
            {((this.state.message !== null || this.state.files.length || this.state.encFiles.length) && !this.state.locked) ? (
              <div className="modal-content overflow-hidden shadow-lg border-0 h-100">
                {this.state.files.length > 0 &&
                  <div className="modal-header flex-shrink-0">
                    <div className="files d-flex justify-content-start">
                      <FileDownloadPanel files={this.state.files} onClickFile={() => this.handleClickFile()} />
                    </div>
                  </div>
                }
                <div className="modal-body overflow-auto">
                  {this.state.encFiles.length > 0 &&
                    <div className="files d-flex justify-content-start mb-2">
                      <FileDownloadPanel files={this.state.encFiles} onClickFile={e => this.handleClickEncFile(e)} />
                    </div>
                  }
                  {this.state.message !== null && this.state.clearText &&
                    <Alert type="warning" className="align-self-start" header={l10n.map.alert_header_warning}>
                      {l10n.map.decrypt_cleartext_warning}
                    </Alert>
                  }
                  <div className="plain-text align-self-stretch">
                    <ContentSandbox value={this.state.message} />
                  </div>
                </div>
                {this.state.signer &&
                  <div className="modal-footer justify-content-start flex-shrink-0">
                    {this.signatureStatus()}
                  </div>
                }
              </div>
            ) : (
              <div className={`locked ${this.state.large ? 'large' : ''} modal-content shadow-lg border-0 h-100 ${(!this.state.showNotification && !this.state.waiting) ? 'cursor' : ''}`} onClick={() => this.handleDecrypt()}>
                <img src="../../img/Mailvelope/logo_signet.svg" />
                {this.state.waiting ? (
                  <Spinner />
                ) : (
                  <p className={this.state.showNotification ? 'text-muted' : ''}>{l10n.map.decrypt_show_message_btn}</p>
                )}
              </div>
            )}
          </div>
        </div>
        {this.state.pwdDialog && <iframe className="decrypt-popup-pwd-dialog modal-content" src={`../enter-password/passwordDialog.html?id=${this.state.pwdDialog.id}`} frameBorder={0} />}
        {this.state.notification &&
          <div className="toastWrapper">
            <Toast isOpen={this.state.showNotification} header={this.state.notification.header} toggle={this.state.notification.dismissable ? () => this.hideNotification() : undefined} type={this.state.notification.type} transition={{timeout: 150, unmountOnExit: true, onEntered: () => { this.blurWarning && this.blurWarning.startBlurValid; this.state.notification.autoHide && this.hideNotification(this.state.notification.hideDelay); }}}>
              {this.state.notification.message}
            </Toast>
          </div>
        }
        {this.state.pwdDialog && <div className="modal-backdrop show"></div>}
        {((this.state.message !== null || this.state.files.length > 0 || this.state.encFiles.length > 0) && this.state.waiting && !this.state.locked) && <Spinner fullscreen={true} />}
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

DecryptMessage.propTypes = {
  id: PropTypes.string,
  embedded: PropTypes.bool
};
