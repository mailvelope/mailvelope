/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {port, getAppDataSlot} from '../app';
import {KeyringOptions} from './KeyringOptions';
import * as l10n from '../../lib/l10n';
import {normalizeArmored, formatFpr, dataURL2str} from '../../lib/util';
import * as fileLib from '../../lib/file';
import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Link} from 'react-router-dom';
import KeySearch from './components/KeySearch';
import Alert from '../../components/util/Alert';
import Spinner from '../../components/util/Spinner';
import FileUpload from '../../components/util/FileUpload';

const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
const PRIVATE_KEY_REGEX = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
const MAX_KEY_IMPORT_SIZE = 10000000;

l10n.register([
  'alert_header_success',
  'alert_header_warning',
  'form_back',
  'form_confirm',
  'form_confirm',
  'form_import',
  'form_import',
  'form_import',
  'form_import',
  'key_import_contacts_import_btn',
  'key_import_default_description',
  'key_import_error',
  'key_import_exception',
  'key_import_file_label',
  'key_import_from_text_btn',
  'key_import_from_text_label',
  'key_import_hkp_search_btn',
  'key_import_hkp_search_btn',
  'key_import_invalid_text',
  'key_import_number_of_failed',
  'key_import_textarea',
  'key_import_textarea',
  'key_import_too_big',
  'keygrid_key_fingerprint',
  'keygrid_keyid',
  'keygrid_user_email',
  'keygrid_user_name',
  'keyring_confirm_keys',
  'keyring_import_description',
  'keyring_import_keys',
  'keyring_import_search_description'
]);

export default class KeyImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      armoredKeys: [],
      invalid: 0,
      files: [],
      keys: [],
      textImport: '',
      showTextInput: false,
      waiting: false,
      redirect: false
    };
    this.handlePreviewImport = this.handlePreviewImport.bind(this);
    this.handleImport = this.handleImport.bind(this);
  }

  componentDidMount() {
    this.fileUpload = new fileLib.FileUpload();
    // key import push scenario
    if (/\/push$/.test(this.props.location.pathname)) {
      getAppDataSlot()
      .then(armored => this.handlePreviewImport(armored));
    }
  }

  async handlePreviewImport(armored) {
    this.setState({waiting: true, alert: []});
    const armoreds = [];
    if (armored) {
      armoreds.push(armored);
    }
    if (this.state.textImport !== '') {
      armoreds.push(this.state.textImport);
    }
    if (this.state.files) {
      for (const file of this.state.files) {
        armoreds.push(dataURL2str(file.content));
      }
    }
    try {
      const armoredKeys = [];
      for (const armored of armoreds) {
        if (armored.length > MAX_KEY_IMPORT_SIZE) {
          throw {message: l10n.map.key_import_too_big, type: 'error'};
        }
        // find all public and private keys in the textbox
        const publicKeys = armored.match(PUBLIC_KEY_REGEX);
        const privateKeys = armored.match(PRIVATE_KEY_REGEX);
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
        if (!publicKeys && !privateKeys) {
          throw {message: l10n.map.key_import_invalid_text, type: 'error'};
        }
      }
      // get armoredKeys from armored
      const {keys, invalid} = await port.send('read-amored-keys', {armoredKeys: armoredKeys.map(key => key.armored)});
      this.setState({armoredKeys, keys, invalid});
    } catch (error) {
      this.props.onNotification({id: Date.now(), header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'error'});
    }
    this.setState({waiting: false});
  }

  async handleImport() {
    const alert = [];
    this.setState({waiting: true, alert: []});
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
          case 'error':
            header = l10n.map.key_import_error;
            type = 'danger';
            break;
        }
        alert.push({header, message, type});
      });
      const succeeded = alert.filter(({type}) => type === 'success');
      if (this.props.onKeyringChange) {
        await this.props.onKeyringChange();
      }
      if (succeeded.length <= 5) {
        let hideDelay = 5000;
        for (const {header, message} of succeeded) {
          this.props.onNotification({id: Date.now(), header, message, type: 'success', hideDelay});
          hideDelay += 1000;
        }
      } else {
        this.props.onNotification({id: Date.now(), message: <strong>{`${succeeded.length} Schlüssel erfolgreich importiert!`}</strong>, type: 'success'});
      }
      for (const {header, message} of alert.filter(({type}) => type !== 'success')) {
        this.props.onNotification({id: Date.now(), header, message, type: 'error'});
      }
      this.setState({redirect: true, amoredKeys: [], keys: [], textImport: ''});
    } catch (error) {
      this.props.onNotification({id: Date.now(), header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'error'});
      this.setState({waiting: false});
    }
  }

  handleAddFile(files) {
    files = Array.from(files);
    const filesSize = files.reduce((total, file) => total + file.size, 0);
    const uploadedSize = this.state.files.reduce((total, file) => total + file.size, 0);
    const currentAttachmentsSize = uploadedSize + filesSize;
    if (currentAttachmentsSize > MAX_KEY_IMPORT_SIZE) {
      this.props.onNotification({id: Date.now(), header: l10n.map.alert_header_error, message: `${l10n.map.key_import_too_big} ${Math.floor(MAX_KEY_IMPORT_SIZE / (1024 * 1024))}MB.`, type: 'error'});
      return;
    }
    for (const file of files) {
      try {
        this.addFile(file);
      } catch (error) {
        this.setErrorNotification(error, file.name, 'upload');
      }
    }
  }

  addFile(file) {
    if (fileLib.isOversize(file)) {
      throw new Error(l10n.map.encrypt_upload_file_warning_too_big);
    }
    this.fileUpload.readFile(file)
    .then(file => this.setState(prevState => ({files: [...prevState.files, file]})));
  }

  handleRemoveFile(id) {
    this.setState(prevState => ({files: prevState.files.filter(file => file.id !== id)}));
  }

  setErrorNotification(error, filename = '', source = 'import') {
    const notification = {id: Date.now(), type: 'error', message: error.message};
    if (source === 'import') {
      notification.header = filename ? l10n.get('decrypt_file_error_header', [filename]) : l10n.map.decrypt_text_error_header;
    } else {
      notification.header = l10n.get('encrypt_upload_file_error', [filename]);
    }
    if (error.code === 'NO_KEY_FOUND') {
      notification.hideDelay = 5500;
    }
    this.setState(prevState => ({notifications: [...prevState.notifications, notification]}));
  }

  handleBack() {
    this.setState({keys: [], armoredKeys: [], textImport: ''});
  }

  render() {
    if (this.state.redirect) {
      return (
        <Redirect to="/keyring/display/" />
      );
    }
    return (
      <>
        <div className="keyImport card-body">
          {!this.state.keys.length ? (
            <>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb bg-transparent p-0">
                  <li className="breadcrumb-item"><Link to='/keyring' replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
                </ol>
              </nav>
              <div className="card-title d-flex flex-wrap align-items-center">
                <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_import_keys}</h1>
                <button type="button" onClick={() => this.handlePreviewImport()} className="btn btn-primary" disabled={!this.state.files.length && !this.state.textImport}>{l10n.map.key_import_contacts_import_btn}</button>
              </div>
              <nav>
                <ul className="nav navbar-nav navbar-tabs" id="nav-tab" role="tablist">
                  <li className="nav-item" role="menuitem"><a className="nav-link active" data-toggle="tab" href="#key-import" role="tab" aria-controls="nav-key-import" aria-selected="true">{l10n.map.form_import}</a></li>
                  {!this.context.demail && <li className="nav-item" role="menuitem"><a className="nav-link" data-toggle="tab" href="#key-search" role="tab" aria-controls="nav-key-search" aria-selected="false">{l10n.map.key_import_hkp_search_btn}</a></li>}
                </ul>
              </nav>
              <div className="tab-content mt-4" id="nav-tabContent">
                <div className="tab-pane fade show active" id="key-import" role="tabpanel" aria-labelledby="nav-key-import-tab">
                  <p>{l10n.map.keyring_import_description}</p>

                  <div className="form-group mb-5">
                    <label>{l10n.map.key_import_file_label}</label>
                    <FileUpload files={this.state.files} filter={['.asc', '.gpg']} onRemoveFile={id => this.handleRemoveFile(id)} onChangeFileInput={files => this.handleAddFile(files)} />
                  </div>
                  <div className="form-group">
                    {!this.state.showTextInput ? (
                      <div className="d-flex justify-content-center">
                        <button type="button" onClick={() => this.setState({showTextInput: true})} className="btn btn-secondary">{l10n.map.key_import_from_text_btn}</button>
                      </div>
                    ) : (
                      <>
                        <label>{l10n.map.key_import_from_text_label}</label>
                        <textarea id="textImport" className="form-control mb-0" value={this.state.textImport} onChange={event => this.setState({textImport: event.target.value})} rows={8} autoFocus spellCheck="false" autoComplete="off" />
                      </>
                    )}
                  </div>
                </div>
                <div className="tab-pane fade" id="key-search" role="tabpanel" aria-labelledby="nav-key-search-tab">
                  <p>{l10n.map.keyring_import_search_description}</p>
                  <KeySearch prefs={this.props.prefs} />
                </div>
              </div>
            </>
          ) : (
            <>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb bg-transparent p-0">
                  <li className="breadcrumb-item"><a onClick={() => this.handleBack()}><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_import_keys}</a></li>
                </ol>
              </nav>
              <div className="card-title d-flex flex-wrap align-items-center">
                <h1 className="flex-shrink-0">{this.state.keys.length > 1 ? l10n.get('keyring_confirm_keys_plural', [this.state.keys.length]) : l10n.map.keyring_confirm_keys}</h1>
                <div className="ml-auto flex-shrink-0">
                  <div className="btn-bar">
                    <button type="button" onClick={() => this.handleBack()} className="btn btn-secondary">{l10n.map.form_cancel}</button>
                    <button type="button" onClick={this.handleImport} className="btn btn-primary">{l10n.map.form_confirm}</button>
                  </div>
                </div>
              </div>
              <p>{l10n.map.key_import_default_description}</p>
              {this.state.invalid > 0 && <Alert header={l10n.map.alert_header_warning} type="danger">{this.state.invalid > 1 ? l10n.get('key_import_number_of_failed_plural', [this.state.invalid.length]) : l10n.map.key_import_number_of_failed}</Alert>}
              <div className="table-responsive">
                <table className="table table-custom">
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
                            {userIndex === 0 && <span className={`icon icon-${key.type === 'public' ? 'key' : 'key-pair'}`} style={{fontSize: '1.25rem'}}></span>}
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
            </>
          )}
        </div>
        {this.state.waiting && <Spinner fullscreen={true} delay={0} />}
      </>
    );
  }
}

KeyImport.contextType = KeyringOptions;

KeyImport.propTypes = {
  onKeyringChange: PropTypes.func,
  onNotification: PropTypes.func,
  prefs: PropTypes.object,
  location: PropTypes.object
};
