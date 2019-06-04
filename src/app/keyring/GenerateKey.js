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
import DefinePassword from '../../components/util/DefinePassword';
import Modal from '../../components/util/Modal';
import {Redirect, Link} from 'react-router-dom';

l10n.register([
  'alert_header_success',
  'form_back',
  'form_clear',
  'keyring_generate_key',
  'key_gen_generate',
  'key_gen_another',
  'key_gen_upload',
  'key_gen_success',
  'key_gen_wait_header',
  'key_gen_wait_info',
  'learn_more_link'
]);

// set locale
moment.locale(navigator.language);

export default class GenerateKey extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
    this.handleChange = this.handleChange.bind(this);
    this.handleGenerate = this.handleGenerate.bind(this);
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
      key: null, // generated key
      modified: false
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
      return {[target.id]: value, errors, modified: true};
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
      const newKey = await port.send('generateKey', {parameters, keyringId: this.context.keyringId});
      if (this.props.onKeyringChange) {
        await this.props.onKeyringChange();
      }
      this.setState({key: newKey}, () => this.props.onNotification({id: Date.now(), header: l10n.map.alert_header_success, message: l10n.map.key_gen_success, type: 'success'}));
    } catch (error) {
      this.setState({generating: false, modified: false}, () => this.props.onNotification({id: Date.now(), header: l10n.map.key_gen_error, message: error.message, type: 'error'}));
    }
  }

  render() {
    if (this.state.key) {
      return (
        <Redirect to={`/keyring/display/${this.state.key.keyId}`} />
      );
    }
    return (
      <div className={`card-body ${this.state.generating ? 'busy' : ''}`}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-transparent p-0">
            <li className="breadcrumb-item"><Link to='/keyring' replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
          </ol>
        </nav>
        <div className="card-title d-flex flex-wrap align-items-center">
          <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_generate_key}</h1>
          <button type="button" onClick={this.handleGenerate} disabled={Object.keys(this.state.errors).length || !this.state.modified} className="btn btn-primary">{l10n.map.key_gen_generate}</button>
        </div>
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
        </form>
        <Modal isOpen={this.state.generating} title={l10n.map.key_gen_wait_header} onShow={this.generateKey} keyboard={false} hideFooter={true} onHide={() => this.setState({generating: false})}>
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
  onKeyringChange: PropTypes.func,
  onNotification: PropTypes.func
};

GenerateKey.defaultProps = {
  defaultName: '',
  defaultEmail: ''
};
