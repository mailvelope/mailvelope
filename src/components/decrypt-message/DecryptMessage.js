/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Tooltip} from 'reactstrap';
import * as l10n from '../../lib/l10n';
import {LARGE_FRAME} from '../../lib/constants';
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
  'keygrid_keyid',
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
      locked: false,
      files: [],
      encFiles: [],
      error: null,
      showError: false,
      pwdDialog: null,
      terminate: false,
      signatureToolTipOpen: false,
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
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('show-password-required', this.onShowPwdRequired);
    this.port.on('show-pwd-dialog', this.onShowPwdDialog);
    this.port.on('hide-pwd-dialog', this.onHidePwdDialog);
    this.port.on('terminate', this.onTerminate);
    this.port.on('set-enc-attachments', this.onEncAttachments);
    this.port.on('waiting', () => this.setState({showError: false, waiting: true}));
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
    this.setState({locked: true});
  }

  onVerifiedMessage(msg) {
    this.onSignatureVerification(msg);
    this.setState({message: `<pre style="color: inherit; font-size: inherit;">${encodeHTML(msg.message)}</pre>`, waiting: false});
  }

  onDecryptedMessage({message}) {
    this.setState({message, waiting: false, locked: false});
  }

  onDecryptedAttachment({attachment}) {
    const file = {
      id: getHash(),
      name: attachment.filename
    };
    const content = str2ab(attachment.content || attachment.data);
    // set MIME type fix to application/octet-stream as other types can be exploited in Chrome
    attachment.mimeType = 'application/octet-stream';
    const blob = new Blob([content], {type: attachment.mimeType});
    file.objectURL = window.URL.createObjectURL(blob);
    this.setState(prevState => {
      prevState.encFiles.splice(prevState.encFiles.findIndex(({name}) => name === attachment.encFileName), 1);
      return {
        files: [...prevState.files, file],
        encFiles: [...prevState.encFiles],
        waiting: false,
        showError: false
      };
    });
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

  onEncAttachments({encAtts}) {
    this.setState({encFiles: encAtts.map((filename, index) => ({id: index, name: filename})), waiting: false});
  }

  handleClickEncFile(e) {
    e.preventDefault();
    const fileName = e.currentTarget.getAttribute('download');
    this.setState({waiting: true}, () => this.port.emit('download-enc-attachment', {fileName}));
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
      locked: true,
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
    this.setState({error: null});
  }

  handleDecrypt() {
    if (!this.state.showError && !this.state.waiting) {
      this.setState({waiting: true}, () => this.port.emit('decrypt-message'));
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
        {this.props.embedded ?
          (
            <>
              <Alert id="SignatureDetails" type="info" className="my-1 px-2 flex-shrink-1 text-truncate">
                <span href="#" id="SignatureDetails">
                  <span className="icon icon-key" style={{fontSize: '1.25rem'}}></span>
                  <strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}>`}
                </span>
              </Alert>
              <Tooltip innerClassName="text-left" placement="auto-end" isOpen={this.state.signatureToolTipOpen} container={this.element.firstChild} target="SignatureDetails" autohide={false} toggle={() => this.setState(prevState => ({signatureToolTipOpen: !prevState.signatureToolTipOpen}))}>
                <span><strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}>`}<br /> {`${l10n.map.keygrid_keyid} #${this.state.signer.keyId ? this.state.signer.keyId.toUpperCase() : this.state.signer.keyDetails.keyId.toUpperCase()}`}</span>
              </Tooltip>
            </>
          ) : (
            <Alert type="info" className="my-1 px-2 flex-shrink-1">
              <span className="icon icon-key" style={{fontSize: '1.25rem'}}></span>
              <strong>{this.state.signer.keyDetails.name}</strong> {`<${this.state.signer.keyDetails.email}> #${this.state.signer.keyId ? this.state.signer.keyId.toUpperCase() : this.state.signer.keyDetails.keyId.toUpperCase()}`}
            </Alert>
          )}
      </div>
    );
  }

  render() {
    return (
      <SecurityBG className={`decrypt-msg ${this.props.embedded ? 'embedded' : ''}`} port={this.port}>
        <div className="modal d-block" style={{zIndex: 1035}}>
          <div ref={node => this.element = node} className="modal-dialog h-100 mw-100 m-0">
            {((this.state.message || this.state.files.length || this.state.encFiles.length) && !this.state.locked) ? (
              <div className="modal-content overflow-hidden shadow-lg border-0 h-100">
                {this.state.files.length > 0 && (
                  <div className="modal-header flex-shrink-0">
                    <div className="files d-flex justify-content-start">
                      <FileDownloadPanel files={this.state.files} onClickFile={() => this.handleClickFile()} />
                    </div>
                  </div>
                )}
                <div className="modal-body overflow-auto">
                  {this.state.encFiles.length > 0 && (
                    <div className="files d-flex justify-content-start mb-2">
                      <FileDownloadPanel files={this.state.encFiles} onClickFile={e => this.handleClickEncFile(e)} />
                    </div>
                  )}
                  <div className="plain-text align-self-stretch">
                    <ContentSandbox value={this.state.message} />
                  </div>
                </div>
                {this.state.signer && (
                  <div className="modal-footer justify-content-start flex-shrink-0">
                    {this.signatureStatus()}
                  </div>
                )}
              </div>
            ) : (
              <div className={`locked ${this.state.large ? 'large' : ''} modal-content overflow-hidden shadow-lg border-0 h-100 ${(!this.state.showError && !this.state.waiting) ? 'cursor' : ''}`} onClick={() => this.handleDecrypt()}>
                <img src="../../img/Mailvelope/logo_signet.svg" />
                {this.state.waiting ? (
                  <Spinner />
                ) : (
                  <p className={this.state.showError ? 'text-muted' : ''}>{l10n.map.decrypt_show_message_btn}</p>
                )}
              </div>
            )}
          </div>
        </div>
        {this.state.pwdDialog && <iframe className="decrypt-popup-pwd-dialog modal-content" src={`../enter-password/passwordDialog.html?id=${this.state.pwdDialog.id}`} frameBorder={0} />}
        {this.state.error &&
          <div className="toastWrapper">
            <Toast isOpen={this.state.showError} header={this.state.error.header} toggle={() => this.setState(prevState => ({showError: !prevState.showError}))} type="error" transition={{timeout: 150, unmountOnExit: true, onExited: () => this.setState({error: null, waiting: false})}}>
              {this.state.error.message}
            </Toast>
          </div>
        }
        {this.state.pwdDialog && <div className="modal-backdrop show"></div>}
        {((this.state.message || this.state.files.length > 0 || this.state.encFiles.length > 0) && this.state.waiting && !this.state.locked) && <Spinner fullscreen={true} />}
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

DecryptMessage.propTypes = {
  id: PropTypes.string,
  embedded: PropTypes.bool
};
