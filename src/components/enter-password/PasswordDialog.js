/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';
import Spinner from '../util/Spinner';
import Alert from '../util/Alert';

// register language strings
l10n.register([
  'pwd_dialog_header',
  'pwd_dialog_pwd_please',
  'pwd_dialog_reason_decrypt',
  'pwd_dialog_reason_sign',
  'pwd_dialog_reason_revoke',
  'pwd_dialog_reason_add_user',
  'pwd_dialog_reason_revoke_user',
  'pwd_dialog_reason_set_exdate',
  'pwd_dialog_reason_editor',
  'pwd_dialog_reason_create_backup',
  'pwd_dialog_reason_create_draft',
  'pwd_dialog_cache_pwd',
  'pwd_dialog_wrong_pwd',
  'form_ok',
  'form_cancel'
]);

export default class PasswordDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      keyId: '',
      userId: '',
      reason: '',
      cache: false,
      password: '',
      waiting: true,
      showError: false
    };
    this.handleCancel = this.handleCancel.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.port = EventHandler.connect(`pwdDialog-${this.props.id}`, this);
    this.registerEventListeners();
    this.port.emit('pwd-dialog-init');
  }

  componentDidMount() {
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  componentDidUpdate() {
    if ((!this.state.waiting && !this.state.password) || this.state.showError) {
      this.pwdInput.focus();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keyup', this.onKeyUp);
  }

  onKeyUp({keyCode}) {
    if (keyCode === 13) {
      if (!this.state.showError) {
        this.handleConfirm();
      }
    }
    if (keyCode === 27) {
      this.handleCancel();
    }
  }

  registerEventListeners() {
    this.port.on('set-init-data', this.setInitData);
    this.port.on('wrong-password', this.onWrongPassword);
  }

  setInitData({keyId, userId, reason, cache}) {
    this.setState({
      keyId,
      userId,
      reason: reason !== '' ? l10n.map[reason.toLowerCase()] : '',
      cache,
      waiting: false
    });
  }

  onWrongPassword() {
    this.setState({showError: true, waiting: false});
  }

  onInputPaste(value) {
    this.setState({password: value, showError: false});
    this.logUserInput('security_log_password_input');
  }

  onChangeCache(value) {
    this.setState({cache: value});
    this.logUserInput('security_log_password_click');
  }

  logUserInput(type) {
    this.port.emit('pwd-user-input', {
      source: 'security_log_password_dialog',
      type
    });
  }

  handleCancel() {
    this.logUserInput('security_log_dialog_cancel');
    this.port.emit('pwd-dialog-cancel');
  }

  handleConfirm() {
    this.logUserInput('security_log_dialog_ok');
    this.setState({waiting: true});
    this.port.emit('pwd-dialog-ok', {password: this.state.password, cache: this.state.cache});
  }

  render() {
    return (
      <SecurityBG port={this.port}>
        <div className="modal d-block" style={{padding: '2.75rem'}}>
          <div className="modal-dialog h-100 mw-100 m-0">
            <div className="modal-content shadow-lg border-0 h-100" style={{backgroundColor: 'rgba(255,255,255,1)'}}>
              {this.state.waiting ? (
                <Spinner style={{margin: 'auto auto'}} />
              ) : (
                <>
                  <div className="modal-header justify-content-center border-0 p-4 flex-shrink-0">
                    <h4 className="modal-title">{l10n.map.pwd_dialog_header}</h4>
                  </div>
                  <div className="modal-body overflow-auto py-0 px-4">
                    <Alert type="info" className="d-flex align-items-center overflow-hidden pl-2">
                      <span className="icon icon-key lead text-info mr-2"></span>
                      <div>
                        <b>{this.state.userId}</b><br />{this.state.keyId}
                      </div>
                    </Alert>
                    {this.state.reason && <p>{this.state.reason}</p>}
                    <div className="form-group">
                      <input ref={node => this.pwdInput = node} type="password" value={this.state.password} onPaste={e => { e.preventDefault(); this.onInputPaste(e.clipboardData.getData('Text')); }} onChange={e => this.onInputPaste(e.target.value)} className={`form-control text-monospace ${this.state.showError ? 'is-invalid' : ''}`} />
                      <div className={this.state.showError ? 'invalid-feedback' : 'd-none'}>{l10n.map.pwd_dialog_wrong_pwd}</div>
                    </div>
                    <div>
                      <div className="custom-control custom-checkbox">
                        <input type="checkbox" checked={this.state.cache} onChange={e => this.onChangeCache(e.target.checked)} className="custom-control-input" id="remember" />
                        <label className="custom-control-label" htmlFor="remember">{l10n.map.pwd_dialog_cache_pwd}</label>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer justify-content-center border-0 p-4 flex-shrink-0">
                    <div className="btn-bar">
                      <button type="button" onClick={this.handleCancel} className="btn btn-secondary">{l10n.map.form_cancel}</button>
                      <button type="button" onClick={this.handleConfirm} disabled={this.state.showError} className="btn btn-primary">{l10n.map.form_ok}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SecurityBG>
    );
  }
}

PasswordDialog.propTypes = {
  id: PropTypes.string,
};
