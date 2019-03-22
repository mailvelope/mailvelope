/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
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
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';
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
  'key_gen_success',
  'key_gen_wait_header',
  'key_gen_wait_info'
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
    this.setState({alert: null});
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

  async generateKey() {
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
    try {
      await port.send('generateKey', {parameters, keyringId: this.context.keyringId});
      this.handleReset({
        alert: {header: l10n.map.alert_header_success, message: l10n.map.key_gen_success, type: 'success'},
      });
      if (this.props.onKeyringChange) {
        this.props.onKeyringChange();
      }
    } catch (error) {
      this.setState({
        alert: {header: l10n.map.key_gen_error, message: error.message || '', type: 'danger'}
      });
    }
    this.setState({generating: false});
  }

  handleReset({alert = null}) {
    this.setState({...this.getInitialState(this.context), alert});
  }

  render() {
    return (
      <div className={`card-body ${this.state.generating ? 'busy' : ''}`}>
        <h2 className="mb-4">{l10n.map.keyring_generate_key}</h2>
        <form className="form" autoComplete="off">
          <NameAddrInput name={this.state.name} email={this.state.email} onChange={this.handleChange} errors={this.state.errors} />
          <AdvancedExpand>
            <AdvKeyGenOptions value={this.state} onChange={this.handleChange} />
          </AdvancedExpand>
          {!this.context.gnupg && <DefinePassword value={this.state.password} errors={this.state.errors} onChange={this.handleChange} />}
          <div className={`form-group custom-control custom-checkbox ${this.context.demail ? 'd-none' : ''}`}>
            <input className="custom-control-input" checked={this.state.mveloKeyServerUpload} onChange={this.handleChange} type="checkbox" id="mveloKeyServerUpload" />
            <label className="custom-control-label" htmlFor="mveloKeyServerUpload"><span>{l10n.map.key_gen_upload}</span>. <a href="https://keys.mailvelope.com" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
          </div>
          <div className="form-group">
            {this.state.alert && <Alert header={this.state.alert.header} type={this.state.alert.type}>{this.state.alert.message}</Alert>}
          </div>
          <div className="btn-bar">
            <button onClick={this.handleGenerate} type="button" className="btn btn-primary">{l10n.map.key_gen_generate}</button>
            <Link className="btn btn-secondary" to='/keyring' replace tabIndex="0">
              <span>{l10n.map.action_menu_back}</span>
            </Link>
          </div>
        </form>
        <Modal isOpen={this.state.generating} title={l10n.map.key_gen_wait_header} onShow={this.generateKey} keyboard={false} hideFooter={true}>
          <>
            <div className="progress mb-3">
              <div className="progress-bar progress-bar-striped progress-bar-animated w-100" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <p className="text-muted">{l10n.map.key_gen_wait_info}</p>
          </>
        </Modal>
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
