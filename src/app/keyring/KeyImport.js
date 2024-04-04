/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {port, getAppDataSlot} from '../app';
import {KeyringOptions} from './KeyringOptions';
import {TabContent, TabPane} from 'reactstrap';
import * as l10n from '../../lib/l10n';
import {normalizeArmored, formatFpr, dataURL2str} from '../../lib/util';
import * as fileLib from '../../lib/file';
import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Link} from 'react-router-dom';
import KeySearch from './components/KeySearch';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';
import Spinner from '../../components/util/Spinner';
import FileUpload from '../../components/util/FileUpload';

const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
const PRIVATE_KEY_REGEX = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
const MAX_KEY_IMPORT_SIZE = 10000000;

l10n.register([
  'alert_header_error',
  'alert_header_success',
  'alert_header_warning',
  'file_read_error',
  'form_back',
  'form_confirm',
  'form_confirm',
  'form_import',
  'form_import',
  'form_import',
  'form_import',
  'key_import_bulk_success',
  'key_import_contacts_import_btn',
  'key_import_default_description',
  'key_import_default_description_plural',
  'key_import_error',
  'key_import_exception',
  'key_import_file_label',
  'key_import_from_text_btn',
  'key_import_from_text_label',
  'key_import_invalid_text',
  'key_import_number_of_failed',
  'key_import_search_btn',
  'key_import_search_found',
  'key_import_search_found_source',
  'key_import_search_found_modified',
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
  'keyring_import_search_description',
  'keyring_import_search_keys'
]);

export default class KeyImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      armoredKeys: [],
      errors: [],
      files: [],
      keys: [],
      textImport: '',
      showTextInput: false,
      waiting: false,
      import: false,
      showImportModal: false,
      redirect: false,
      activeTab: 'import',
      keyRegSourceLabels: [],
      keySourceName: '',
      keyLastModified: null
    };
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
  }

  async componentDidMount() {
    this.fileUpload = new fileLib.FileUpload();
    // key import push scenario
    if (/\/push$/.test(this.props.location.pathname)) {
      const armored = await getAppDataSlot();
      this.handlePreviewImport(armored);
    }
    if (/\/search$/.test(this.props.location.pathname)) {
      this.toggleTab('lookup');
    }
    const keyRegSourceLabels = await port.send('keyreg-source-labels', {externalOnly: true});
    this.setState({keyRegSourceLabels});
  }

  async handlePreviewImport(armored, keySource = {}) {
    this.setState({waiting: true, alert: [], keySourceName: '', ...keySource});
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
      let armoredKeys = [];
      let errors = [];
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
          errors.push({msg: l10n.map.key_import_invalid_text});
        }
      }
      let keys = [];
      if (armoredKeys.length) {
        const {keys: validKeys, errors: err, armoreds: validArmoreds} = await port.send('read-amored-keys', {armoredKeys});
        keys = validKeys;
        armoredKeys = validArmoreds;
        errors = [...errors, ...err];
      }
      if (!keys.length && errors.length) {
        let hideDelay = 5000;
        for (const {msg, code} of errors) {
          this.props.onNotification({id: Date.now(), header: l10n.map.alert_header_error, message: code ? l10n.get(code.toLowerCase(), [msg]) : msg, type: 'error', hideDelay});
          hideDelay += 1000;
        }
        return;
      }
      this.setState({armoredKeys, keys, errors, showImportModal: true});
    } catch (error) {
      console.log('Error on key import preview:', error);
      this.props.onNotification({id: Date.now(), header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'error'});
    } finally {
      this.setState({waiting: false});
    }
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
      let hideDelay = 5000;
      if (succeeded.length <= 5) {
        for (const {header, message} of succeeded) {
          this.props.onNotification({id: Date.now(), header, message, type: 'success', hideDelay});
          hideDelay += 1000;
        }
      } else {
        this.props.onNotification({id: Date.now(), message: <strong>{`${succeeded.length} ${l10n.map.key_import_bulk_success}`}</strong>, type: 'success', hideDelay});
        hideDelay += 1000;
      }
      for (const {header, message} of alert.filter(({type}) => type !== 'success')) {
        this.props.onNotification({id: Date.now(), header, message, type: 'error', hideDelay});
        hideDelay += 1000;
      }
      this.setState({redirect: true, amoredKeys: [], keys: [], textImport: ''});
    } catch (error) {
      console.log('Error on key import:', error);
      this.props.onNotification({id: Date.now(), header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'error'});
      this.setState({waiting: false});
    }
  }

  async handleKeyFound(key) {
    this.handlePreviewImport(key.armored, {keySourceName: key.source, keyLastModified: new Date(key.lastModified)});
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
      notification.header = l10n.get('file_read_error', [filename]);
    }
    if (error.code === 'NO_KEY_FOUND') {
      notification.hideDelay = 5500;
    }
    this.setState(prevState => ({notifications: [...prevState.notifications, notification]}));
  }

  handleHiddenModal() {
    if (this.state.import) {
      this.handleImport();
    } else {
      this.setState({keys: [], armoredKeys: [], textImport: ''});
    }
  }

  toggleTab(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab,
        textImport: '',
        files: []
      });
    }
  }

  render() {
    if (this.state.redirect) {
      return (
        <Redirect to="/keyring/display/" />
      );
    }
    const keySource = this.state.keyRegSourceLabels.find(source => source.name === this.state.keySourceName);
    return (
      <>
        <div className="keyImport card-body">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0">
              <li className="breadcrumb-item"><Link to="/keyring" replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
            </ol>
          </nav>
          <div className="card-title d-flex flex-wrap align-items-center">
            <h1 className="flex-shrink-0 mr-auto">{this.state.activeTab === 'import' ? l10n.map.keyring_import_keys : l10n.map.keyring_import_search_keys}</h1>
          </div>
          <TabContent className="mt-4" activeTab={this.state.activeTab}>
            <TabPane tabId="import">
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
              <div className="form-group d-flex justify-content-end">
                <button type="button" onClick={() => this.handlePreviewImport()} className="btn btn-primary" disabled={!this.state.files.length && !this.state.textImport}>{l10n.map.key_import_contacts_import_btn}</button>
              </div>
            </TabPane>
            <TabPane tabId="lookup">
              <p>{l10n.map.keyring_import_search_description}</p>
              <KeySearch onKeyFound={key => this.handleKeyFound(key)} sourceLabels={this.state.keyRegSourceLabels} />
            </TabPane>
          </TabContent>
        </div>
        <Modal isOpen={this.state.showImportModal} toggle={() => this.setState(prevState => ({showImportModal: !prevState.showImportModal}))} size="large" title={this.state.keys.length > 1 ? l10n.get('keyring_confirm_keys_plural', [this.state.keys.length]) : l10n.map.keyring_confirm_keys} onHide={this.handleHiddenModal} footer={
          <div className="modal-footer border-0 pt-0">
            <div className="btn-bar">
              <button type="button" onClick={() => this.setState({showImportModal: false})} className="btn btn-secondary">{l10n.map.form_cancel}</button>
              <button type="button" onClick={() => this.setState({import: true, showImportModal: false})} className="btn btn-primary">{l10n.map.form_confirm}</button>
            </div>
          </div>
        }>
          {this.state.keySourceName && <p>
            {l10n.map.key_import_search_found}
            <ul>
              <li>{l10n.map.key_import_search_found_source} <strong key="1"><a target="_blank" rel="noopener noreferrer" href={keySource.url}>{keySource.label}</a></strong></li>
              <li>{l10n.map.key_import_search_found_modified} <strong key="0">{this.state.keyLastModified.toLocaleDateString()}</strong></li>
            </ul>
          </p>}
          <p>{this.state.keys.length > 1 ? l10n.map.key_import_default_description_plural : l10n.map.key_import_default_description}</p>
          {this.state.errors.length > 0 && <Alert header={l10n.map.alert_header_warning} type="danger">{this.state.errors.length > 1 ? l10n.get('key_import_number_of_failed_plural', [this.state.errors.length]) : l10n.map.key_import_number_of_failed}</Alert>}
          <div className="table-responsive" style={{maxHeight: '360px'}}>
            <table className="table table-custom table-sm">
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
                      <td className={`monospaced text-muted ${userIndex !== 0 ? 'border-top-0' : ''}`} style={{maxWidth: '150px', lineHeight: 1}}><small>{userIndex === 0 ? formatFpr(key.fingerprint) : ''}</small></td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Modal>
        {this.state.waiting && <Spinner fullscreen={true} delay={0} />}
      </>
    );
  }
}

KeyImport.contextType = KeyringOptions;

KeyImport.propTypes = {
  onKeyringChange: PropTypes.func,
  onNotification: PropTypes.func,
  location: PropTypes.object
};
