/**
 * Copyright (C) 2012-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {showSecurityBackground, getHash, str2ab, terminate} from '../../lib/util';
import EventHandler from '../../lib/EventHandler';
import ContentSandbox from './components/ContentSandbox';
import SignatureModal from './components/SignatureModal';
import {FileDownloadPanel} from '../util/FilePanel';
import Modal from '../util/Modal';
import Alert from '../util/Alert';
import Spinner from '../util/Spinner';

import './DecryptMessage.css';

// register language strings
l10n.register([
  'alert_header_error',
  'decrypt_digital_signature',
  'decrypt_digital_signature_failure',
  'decrypt_digital_signature_null',
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
      error: null
    };
    this.port = EventHandler.connect(`dDialog-${this.props.id}`, this);
    this.registerEventListeners();
    // emit event to backend that editor has initialized
    this.port.emit('decrypt-message-init');
  }

  componentDidMount() {
    if (this.props.secureBackground) {
      showSecurityBackground(this.port, true);
    }
  }

  registerEventListeners() {
    this.port.on('decrypted-message', this.onDecryptedMessage);
    this.port.on('add-decrypted-attachment', this.onDecryptedAttachment);
    this.port.on('signature-verification', this.onSignatureVerification);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('terminate', () => terminate(this.port));
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

  onClickSignature() {
    this.logUserInput('security_log_signature_modal_open');
    this.setState({showSig: true});
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
      waiting: false
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
  }

  handleSignatureModalHide() {
    this.setState({showSig: false});
    this.logUserInput('security_log_signature_modal_close');
  }

  signatureButton() {
    let caption;
    if (!this.state.signer) {
      return null;
    }
    if (this.state.signer.valid) {
      caption = l10n.map.decrypt_digital_signature;
    } else if (this.state.signer.valid === false) {
      caption = l10n.map.decrypt_digital_signature_failure;
    } else if (this.state.signer.valid === null) {
      caption = l10n.map.decrypt_digital_signature_null;
    }
    return (
      <div className="rounded" style={{background: 'rgba(255,255,255,.5)', padding: '0.1rem 0.2rem', fontSize: '80%'}}>
        <a role="button" id="sigBtn" className="text-decoration-none" href="#" onClick={() => this.onClickSignature()}>{caption}</a>
      </div>
    );
  }

  errorModal() {
    if (!this.state.error) {
      return null;
    }
    return (
      <Modal title={this.state.error.header} onCancel={() => this.handleCancel()} hideFooter={true}>
        <Alert type={this.state.error.type}>{this.state.error.message}</Alert>
      </Modal>
    );
  }

  render() {
    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        {this.state.waiting && <Spinner style={{margin: '160px auto 0'}} />}
        <div className={`decrypt-msg fade ${this.state.waiting ? '' : 'show'} d-flex flex-column align-content-center h-100`}>
          <div className="decrypt-msg-header d-flex overflow-auto justify-content-end align-items-center mb-2 w-100">
            <div className={`${!this.props.secureBackground && !this.state.files.length ? 'd-none' : ''} mr-auto`}>
              <FileDownloadPanel files={this.state.files} onClickFile={() => this.handleClickFile()} />
            </div>
            {!this.props.isContainer && this.signatureButton()}
            {this.props.secureBackground &&
              <button type="button" className="btn btn-link secureBgndSettingsBtn lockBtnIcon flex-shrink-0" onClick={() => this.port.emit('open-security-settings')} title={l10n.map.security_background_button_title}></button>
            }
          </div>
          <div className="decrypt-msg-body flex-grow-1 mb-2 w-100">
            <div className="plain-text w-100 h-100">
              <ContentSandbox value={this.state.message} />
            </div>
          </div>
          <div className="decrypt-msg-footer d-flex align-items-center justify-content-end">
            {this.props.isContainer && this.signatureButton()}
          </div>
        </div>
        {this.errorModal()}
        {this.state.showSig && <SignatureModal signer={this.state.signer} onHide={() => this.handleSignatureModalHide()} />}
      </div>
    );
  }
}

DecryptMessage.propTypes = {
  id: PropTypes.string,
  secureBackground: PropTypes.bool,
  isContainer: PropTypes.bool
};

DecryptMessage.defaultProps = {
  secureBackground: true
};
