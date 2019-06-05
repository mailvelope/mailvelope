/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';
import Alert from '../util/Alert';
import Terminate from '../util/Terminate';

import './BackupRestore.css';

// register language strings
l10n.register([
  'key_recovery_failed',
  'restore_backup_dialog_button',
  'restore_backup_dialog_headline',
  'restore_password_dialog_button',
  'restore_password_dialog_headline',
  'wrong_restore_code',
]);

export default class BackupRestore extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: false,
      hidePassword: true,
      code: false,
      terminate: false,
      action: 'setup',
      error: null
    };
    this.port = EventHandler.connect(`restoreBackupDialog-${this.props.id}`, this);
    this.registerEventListeners();
    this.port.emit('restore-backup-dialog-init');
    this.handleClick = this.handleClick.bind(this);
    this.setCode = this.setCode.bind(this);
  }

  registerEventListeners() {
    this.port.on('set-password', msg => this.setState({password: msg.password}));
    this.port.on('error-message', this.handleError);
    this.port.on('terminate', this.terminate);
  }

  componentDidMount() {
    const inputs = this.digits.querySelectorAll('.flex-digit');
    for (const input of inputs) {
      input.addEventListener('input', this.setCode);
      input.addEventListener('paste', this.setCode);
    }
  }

  setCode() {
    const inputs = this.digits.querySelectorAll('.flex-digit');
    let code = '';
    for (const input of inputs) {
      if (input.value.length !== parseInt(input.getAttribute('maxlength'))) {
        code = false;
        break;
      }
      code += input.value;
    }
    this.setState({code});
  }

  handleError(msg) {
    let error;
    switch (msg.error.code) {
      case 'WRONG_RESTORE_CODE':
        // the recovery code is not correct
        error = new Error(l10n.map.wrong_restore_code);
        break;
      default:
        error = new Error(l10n.map.key_recovery_failed);
    }
    if (error) {
      this.setState({error});
    }
  }

  terminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  handleClick() {
    this.logUserInput('security_log_backup_restore');
    this.setState({error: null}, () => this.port.emit('restore-backup-code', {code: this.state.code}));
  }

  logUserInput(type) {
    this.port.emit('key-backup-user-input', {
      source: 'security_log_key_backup',
      type
    });
  }

  render() {
    return (
      <SecurityBG port={this.port}>
        <div className="modal d-block" style={{padding: '1rem'}}>
          <div className="modal-dialog d-flex align-items-center h-100 mw-100 m-0">
            <div className="modal-content shadow-lg border-0" style={{backgroundColor: 'rgba(255,255,255,0.8)'}}>
              <div className="modal-body d-flex flex-column overflow-auto p-4">
                {this.state.password !== false ? (
                  <>
                    <h4 className="mb-2">{l10n.map.restore_password_dialog_headline}</h4>
                    <input type={this.state.hidePassword ? 'password' : 'text'} value={this.state.password} className="form-control flex-grow-1 my-3 text-monospace" readOnly />
                    <button type="button" onClick={() => this.setState({hidePassword: false}, () => this.logUserInput('security_log_restore_backup_click'))} id="restorePasswordBtn" className="btn btn-primary align-self-end" disabled={!this.state.hidePassword}>{l10n.map.restore_password_dialog_button}</button>
                  </>
                ) : (
                  <>
                    <h4 className="mb-2">{l10n.map.restore_backup_dialog_headline}</h4>
                    <div ref={ref => this.digits = ref} className="d-inline-flex align-items-center justify-content-center my-3">
                      <input type="text" className="form-control flex-digit text-monospace" maxLength="5" autoFocus />
                      <span className="flex-separator"> – </span>
                      <input type="text" className="form-control flex-digit text-monospace" maxLength="5" />
                      <span className="flex-separator"> – </span>
                      <input type="text" className="form-control flex-digit text-monospace" maxLength="5" />
                      <span className="flex-separator"> – </span>
                      <input type="text" className="form-control flex-digit text-monospace" maxLength="5" />
                      <span className="flex-separator"> – </span>
                      <input type="text" className="form-control flex-digit text-monospace" maxLength="5" />
                      <span className="flex-separator"> – </span>
                      <input type="text" className="form-control flex-digit last text-monospace" maxLength="1" />
                    </div>
                    {this.state.error && <Alert type="danger">{this.state.error.message}</Alert>}
                    <button type="button" onClick={this.handleClick} className="btn btn-primary align-self-end" disabled={!this.state.code}>{l10n.map.restore_backup_dialog_button}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

BackupRestore.propTypes = {
  id: PropTypes.string,
};
