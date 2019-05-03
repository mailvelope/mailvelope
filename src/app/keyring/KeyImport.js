/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {port, getAppDataSlot} from '../app';
import {KeyringOptions} from './KeyringOptions';
import * as l10n from '../../lib/l10n';
import {normalizeArmored, formatFpr} from '../../lib/util';
import React from 'react';
import PropTypes from 'prop-types';
import KeySearch from './components/KeySearch';
import Alert from '../../components/util/Alert';
import Spinner from '../../components/util/Spinner';
import {Link} from 'react-router-dom';

import './KeyImport.scss';

const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
const PRIVATE_KEY_REGEX = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
const MAX_KEY_IMPORT_SIZE = 10000000;

l10n.register([
  'alert_header_warning',
  'alert_header_success',
  'form_back',
  'form_import',
  'form_confirm',
  'form_import',
  'key_import_error',
  'key_import_too_big',
  'key_import_invalid_text',
  'key_import_exception',
  'key_import_default_description',
  'key_import_number_of_failed',
  'key_import_number_of_failed_plural',
  'key_import_file',
  'key_import_textarea',
  'key_import_hkp_search_btn',
  'keyring_import_keys',
  'keyring_import_description',
  'keyring_import_search_description',
  'keyring_confirm_keys',
  'keyring_confirm_keys_plural',
  'keygrid_keyid',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_key_fingerprint'
]);

export default class KeyImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alert: [],
      armoredKeys: [],
      invalid: 0,
      keys: [],
      textImport: '',
      processing: false
    };
    this.handleChangeFile = this.handleChangeFile.bind(this);
    this.handlePreviewImport = this.handlePreviewImport.bind(this);
    this.handleImport = this.handleImport.bind(this);
  }

  componentDidMount() {
    // key import push scenario
    if (/\/push$/.test(this.props.location.pathname)) {
      getAppDataSlot()
      .then(armored => this.handlePreviewImport(armored));
    }
  }

  handleChangeFile(event) {
    const alert = [];
    const reader = new FileReader();
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    reader.onloadend = ev => this.handlePreviewImport(ev.target.result);
    if (file.size > MAX_KEY_IMPORT_SIZE) {
      alert.push({header: l10n.map.key_import_error, message: l10n.map.key_import_too_big, type: 'danger'});
    } else {
      reader.readAsText(file);
    }
    this.setState({alert});
    // reset input field
    event.target.value = null;
  }

  async handlePreviewImport(armored) {
    this.setState({processing: true, alert: []});
    try {
      if (armored.length > MAX_KEY_IMPORT_SIZE) {
        throw {message: l10n.map.key_import_too_big, type: 'error'};
      }
      // find all public and private keys in the textbox
      const publicKeys = armored.match(PUBLIC_KEY_REGEX);
      const privateKeys = armored.match(PRIVATE_KEY_REGEX);
      const armoredKeys = [];
      if (publicKeys) {
        publicKeys.forEach(pub => {
          pub = normalizeArmored(pub);
          armoredKeys.push({type: 'public', armored: pub});
        });
      }
      if (privateKeys) {
        privateKeys.forEach(priv => {
          priv = normalizeArmored(priv);
          armoredKeys.push({type: 'private', armored: priv});
        });
      }
      if (!armoredKeys.length) {
        throw {message: l10n.map.key_import_invalid_text, type: 'error'};
      }
      // get armoredKeys from armored
      const {keys, invalid} = await port.send('read-amored-keys', {armoredKeys: armoredKeys.map(key => key.armored)});
      this.setState({armoredKeys, keys, invalid});
    } catch (error) {
      this.setState({alert: [{header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'danger'}]});
    }
    this.setState({processing: false});
  }

  async handleImport() {
    const alert = [];
    this.setState({processing: true, alert: []});
    try {
      const result = await port.send('importKeys', {keyringId: this.context.keyringId, keys: this.state.armoredKeys});
      result.forEach(imported => {
        let header;
        const {message} = imported;
        let {type} = imported;
        switch (imported.type) {
          case 'success':
            header = l10n.map.alert_header_success;
            break;
          case 'warning':
            header = l10n.map.alert_header_warning;
            break;
          case 'error':
            header = l10n.map.key_import_error;
            type = 'danger';
            break;
        }
        alert.push({header, message, type});
      });
      this.setState({alert, amoredKeys: [], keys: [], textImport: ''});
    } catch (error) {
      this.setState({alert: [{header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'danger'}]});
    }
    this.setState({processing: false});
  }

  render() {
    return (
      <>
        <div className="keyImport card-body">
          {!this.state.keys.length ? (
            <>
              <h4 className="card-title">{l10n.map.keyring_import_keys}</h4>
              <nav className="mt-3">
                <div className="nav nav-tabs" id="nav-tab" role="tablist">
                  <a className="nav-item nav-link active" data-toggle="tab" href="#key-import" role="tab" aria-controls="nav-key-import" aria-selected="true">{l10n.map.form_import}</a>
                  {!this.context.demail && <a className="nav-item nav-link" data-toggle="tab" href="#key-search" role="tab" aria-controls="nav-key-search" aria-selected="false">{l10n.map.key_import_hkp_search_btn}</a>}
                </div>
              </nav>
              <div className="tab-content mt-4" id="nav-tabContent">
                <div className="tab-pane fade show active" id="key-import" role="tabpanel" aria-labelledby="nav-key-import-tab">
                  <p>{l10n.map.keyring_import_description}</p>
                  <form className="form" autoComplete="off">
                    <div className="form-group">
                      <div>
                        <button id="selectFileButton" type="button" onClick={() => this.fileInput.click()} className="btn btn-info">{l10n.map.key_import_file}</button>
                        <input type="file" onChange={this.handleChangeFile} style={{display: 'none'}} ref={node => this.fileInput = node} />
                      </div>
                    </div>
                    <div className="form-group">
                      <span className="form-text mb-1">{l10n.map.key_import_textarea}</span>
                      <textarea id="newKey" value={this.state.textImport} onChange={event => this.setState({textImport: event.target.value})} style={{width: '100%', fontFamily: 'monospace'}} className="form-control" rows="12" spellCheck="false" autoComplete="off"></textarea>
                    </div>
                    {this.state.alert.map((alert, index) => <Alert header={alert.header} type={alert.type} key={index}>{alert.message}</Alert>)}
                    <div className="btn-bar">
                      <button type="button" onClick={() => this.handlePreviewImport(this.state.textImport)} className="btn btn-primary" disabled={!this.state.textImport}>{l10n.map.form_import}</button>
                      <Link className="btn btn-secondary" to='/keyring' onClick={this.props.onKeyringChange} replace tabIndex="0">
                        <span>{l10n.map.form_back}</span>
                      </Link>
                    </div>
                  </form>
                </div>
                <div className="tab-pane fade" id="key-search" role="tabpanel" aria-labelledby="nav-key-search-tab">
                  <p>{l10n.map.keyring_import_search_description}</p>
                  <KeySearch prefs={this.props.prefs} />
                  <Link className="btn btn-secondary" to='/keyring' onClick={this.props.onKeyringChange} replace tabIndex="0">
                    <span>{l10n.map.form_back}</span>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 className="card-title">{this.state.keys.length > 1 ? l10n.get('keyring_confirm_keys_plural', [this.state.keys.length]) : l10n.map.keyring_confirm_keys}</h4>
              <p>{l10n.map.key_import_default_description}</p>
              {this.state.invalid > 0 && <Alert header={l10n.map.alert_header_warning} type="danger">{this.state.invalid > 1 ? l10n.get('key_import_number_of_failed_plural', [this.state.invalid]) : l10n.map.key_import_number_of_failed}</Alert>}
              <div className="table-responsive">
                <table className="table border">
                  <thead>
                    <tr>
                      <th></th>
                      <th style={{minWidth: '140px'}}>{l10n.map.keygrid_keyid}</th>
                      <th>{l10n.map.keygrid_user_name}</th>
                      <th>{l10n.map.keygrid_user_email}</th>
                      <th>{l10n.map.keygrid_key_fingerprint}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.keys.map((key, keyIndex) =>
                      key.users.map((user, userIndex) =>
                        <tr key={`${keyIndex}${userIndex}`} tabIndex="0" aria-haspopup="true" className={userIndex === 0 && key.users.length > 1 ? 'accent' : ''}>
                          <td className={`text-center ${userIndex !== 0 ? 'border-top-0' : ''}`}>
                            {userIndex === 0 && <i className={`icon icon-${key.type === 'public' ? 'key' : 'keyPair'}`}></i>}
                          </td>
                          <td className={`monospaced text-nowrap ${userIndex !== 0 ? 'border-top-0' : ''}`}>{userIndex === 0 ? key.keyId : ''}</td>
                          <td className={userIndex !== 0 ? 'border-top-0' : ''}>{user.name}</td>
                          <td className={`emailCell ${userIndex !== 0 ? 'border-top-0' : ''}`}>{user.email}</td>
                          <td className={`monospaced text-muted ${userIndex !== 0 ? 'border-top-0' : ''}`}>{userIndex === 0 ? formatFpr(key.fingerprint) : ''}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
              <div className="btn-bar">
                <button type="button" onClick={this.handleImport} className="btn btn-primary">{l10n.map.form_confirm}</button>
                <button type="button" onClick={() => this.setState({keys: [], armoredKeys: [], textImport: ''})} className="btn btn-secondary">{l10n.map.form_cancel}</button>
              </div>
            </>
          )}
        </div>
        {this.state.processing && <Spinner fullscreen={true} delay={0} />}
      </>
    );
  }
}

KeyImport.contextType = KeyringOptions;

KeyImport.propTypes = {
  onKeyringChange: PropTypes.func,
  prefs: PropTypes.object,
  location: PropTypes.object
};
