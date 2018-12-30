/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {checkEmail} from '../../lib/util';
import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import moment from 'moment';

import NameAddrInput from './components/NameAddrInput';
import AdvancedExpand from './components/AdvancedExpand';
import AdvKeyGenOptions from './components/AdvKeyGenOptions';
import DefinePassword from './components/DefinePassword';
import GenerateWait from './components/GenerateWait';
import Alert from '../../components/util/Alert';
import {Link} from 'react-router-dom';

l10n.register([
  'action_menu_back',
  'keyring_generate_key',
  'key_gen_generate',
  'form_clear',
  'key_gen_another',
  'key_gen_upload',
  'learn_more_link',
  'alert_header_success',
  'key_gen_success'
]);

// set locale
moment.locale(navigator.language);

export default class GenerateKey extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
    this.handleChange = this.handleChange.bind(this);
    this.handleGenerate = this.handleGenerate.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.generateKey = this.generateKey.bind(this);
  }

  componentDidMount() {
    this.setState(this.getInitialState(this.context));
  }

  getInitialState({gnupg = false, demail = false} = {}) {
    return {
      name: this.props.defaultName,
      email: this.props.defaultEmail,
      keyAlgo: gnupg ? 'default' : 'rsa',
      keySize: '4096',
      keyExpirationTime: gnupg ? moment().startOf('day').add(2, 'years') : null,
      password: '',
      mveloKeyServerUpload: demail ? false : true,
      generating: false, // key generation in progress
      success: false, // key generation successful
      errors: {}, // form errors
      alert: null // notifications
    };
  }

  handleChange(event) {
    let value;
    const target = event.target;
    switch (target.type) {
      case 'checkbox':
        value = target.checked;
        break;
      default:
        value = target.value;
    }
    this.setState(({errors: err}) => {
      const {[target.id]: deleted, ...errors} = err;
      if (target.error) {
        errors[target.id] = new Error();
      }
      return {[target.id]: value, errors};
    });
  }

  handleGenerate() {
    const errors = {...this.state.errors};
    const validEmail = checkEmail(this.state.email);
    if (!validEmail) {
      errors.email = new Error();
    }
    if (!this.context.gnupg) {
      if (!this.state.password.length) {
        errors.password = new Error();
      }
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }
    this.setState({generating: true});
  }

  generateKey() {
    const parameters = {
      keyAlgo: this.state.keyAlgo,
      numBits: this.state.keySize,
      passphrase: this.state.password,
      uploadPublicKey: this.state.mveloKeyServerUpload
    };
    parameters.userIds = [{
      fullName: this.state.name,
      email: this.state.email
    }];
    if (this.state.keyExpirationTime) {
      parameters.keyExpirationTime = Math.abs(this.state.keyExpirationTime.unix() - moment().startOf('day').unix());
    }
    port.send('generateKey', {parameters, keyringId: this.context.keyringId})
    .then(() => {
      this.setState({
        alert: {header: l10n.map.alert_header_success, message: l10n.map.key_gen_success, type: 'success'},
        success: true
      });
    })
    .catch(error => {
      this.setState({
        alert: {header: l10n.map.key_gen_error, message: error.message || '', type: 'danger'}
      });
    })
    .then(() => {
      this.setState({generating: false});
    });
  }

  handleReset() {
    this.setState(this.getInitialState(this.context));
  }

  render() {
    return (
      <div className={this.state.generating ? 'busy' : ''}>
        <h3 className="logo-header">
          <span>{l10n.map.keyring_generate_key}</span>
        </h3>
        <form className="form" autoComplete="off">
          <NameAddrInput name={this.state.name} email={this.state.email} onChange={this.handleChange} disabled={this.state.success} errors={this.state.errors} />
          <AdvancedExpand>
            <AdvKeyGenOptions value={this.state} onChange={this.handleChange} disabled={this.state.success} />
          </AdvancedExpand>
          {!this.context.gnupg && <DefinePassword value={this.state.password} errors={this.state.errors} onChange={this.handleChange} disabled={this.state.success} />}
          <div className={`form-group ${this.context.demail ? 'hide' : ''}`}>
            <div className="checkbox">
              <label className="checkbox" htmlFor="mveloKeyServerUpload">
                <input checked={this.state.mveloKeyServerUpload} onChange={this.handleChange} type="checkbox" id="mveloKeyServerUpload" disabled={this.state.success} />
                <span>{l10n.map.key_gen_upload}</span>. <a href="https://keys.mailvelope.com" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </label>
            </div>
          </div>
          <div className="form-group">
            {this.state.alert && <Alert header={this.state.alert.header} type={this.state.alert.type}>{this.state.alert.message}</Alert>}
          </div>
          <div className="form-group">
            <button onClick={this.handleGenerate} type="button" className="btn btn-primary">{l10n.map.key_gen_generate}</button>
            <Link className="btn btn-default" to='/keyring' onClick={this.props.onKeyringChange} replace tabIndex="0">
              <span>{l10n.map.action_menu_back}</span>
            </Link>
            <button onClick={this.handleReset} type="button" className={`btn btn-default ${this.state.success ? '' : 'hide'}`}>{l10n.map.key_gen_another}</button>
          </div>
        </form>
        {this.state.generating && <GenerateWait onShow={this.generateKey} />}
      </div>
    );
  }
}

GenerateKey.contextType = KeyringOptions;

GenerateKey.propTypes = {
  defaultName: PropTypes.string,
  defaultEmail: PropTypes.string,
  onKeyringChange: PropTypes.func
};

GenerateKey.defaultProps = {
  defaultName: '',
  defaultEmail: ''
};
