/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {KeyringOptions} from './KeyringOptions';
import Spinner from '../../components/util/Spinner';
import KeyExport from './components/KeyExport';
import Modal from '../../components/util/Modal';
import {Redirect, Link} from 'react-router-dom';
import './KeyGrid.scss';

l10n.register([
  'form_import',
  'keygrid_all_keys',
  'keygrid_creation_date_short',
  'keygrid_default_label',
  'keygrid_delete_confirmation',
  'keygrid_import_title',
  'keygrid_export',
  'keygrid_export_title',
  'key_gen_generate',
  'keygrid_generate_title',
  'keygrid_keyid',
  'keygrid_public_keys',
  'keyring_public_private',
  'keyring_backup',
  'keygrid_refresh',
  'keygrid_refresh_title',
  'keygrid_sort_type',
  'keygrid_user_name',
  'keygrid_user_email'
]);

export default class KeyGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      keyTypeFilter: 'allkeys',
      selectedKey: null,
      keyringBackup: null,
      showExportModal: false
    };
  }

  handleChangeKeyTypeFilter(e) {
    this.setState({keyTypeFilter: e.target.value});
  }

  handleKeyPress(e, index) {
    if (e.key === 'Enter') {
      this.showKeyDetails(index);
    }
  }

  /**
   * @param  {string} type key type 'public' or 'private'
   * @return {bool}      true if key should be filtered out
   */
  filterKey(type) {
    const filter = this.state.keyTypeFilter;
    return filter === 'publickeys' && type !== 'public' ||
           filter === 'keypairs' && type !== 'private';
  }

  showKeyDetails(index) {
    this.setState({selectedKey: index});
  }

  deleteKeyEntry(e, fingerprint) {
    e.stopPropagation();
    const deleteConfirm = confirm(l10n.map.keygrid_delete_confirmation);
    if (deleteConfirm) {
      const key = this.props.keys.find(key => key.fingerprint === fingerprint);
      this.props.onDeleteKey(fingerprint, key.type);
    }
  }

  openExportKeyringDialog() {
    let keys = [];
    let all = false;
    let type = 'pub';
    switch (this.state.keyTypeFilter) {
      case 'allkeys':
        all = true;
        type = 'all';
        break;
      case 'publickeys':
        keys = this.props.keys.filter(key => key.type === 'public');
        break;
      case 'keypairs':
        keys = this.props.keys.filter(key => key.type === 'private');
        type = 'all';
        break;
      default:
        //console.log('unknown filter');
        break;
    }
    this.setState({showExportModal: true, keyringBackup: {
      keyFprs: keys.map(key => key.fingerprint),
      all,
      type
    }});
  }

  render() {
    if (this.state.selectedKey !== null) {
      return <Redirect to={`/keyring/key/${this.state.selectedKey}`} />;
    }
    return (
      <div className="card-body">
        <div className="form-group btn-toolbar justify-content-between" role="toolbar" aria-label="Toolbar with button groups">
          <div className="btn-bar">
            <Link className="btn btn-secondary" to='/keyring/generate' replace tabIndex="0" title={l10n.map.keygrid_generate_title}>
              <i className="icon icon-add" aria-hidden="true"></i> {l10n.map.key_gen_generate}
            </Link>
            <Link className="btn btn-secondary" to='/keyring/import' replace tabIndex="0" title={l10n.map.keygrid_import_title}>
              <i className="icon icon-download" aria-hidden="true"></i> {l10n.map.form_import}
            </Link>
            <button type="button" onClick={() => this.openExportKeyringDialog()} className="btn btn-secondary" title={l10n.map.keygrid_export_title}>
              <i className="icon icon-upload" aria-hidden="true"></i> {l10n.map.keygrid_export}
            </button>
            <button type="button" onClick={this.props.onRefreshKeyring} className="btn btn-secondary" title={l10n.map.keygrid_refresh_title}>
              <i className="icon icon-refresh" aria-hidden="true"></i> {l10n.map.keygrid_refresh}
            </button>
          </div>
          <div>
            <label htmlFor="keyringFilterBtn" className="keyringFilterLabel mr-1">
              <i className="fa fa-filter" aria-hidden="true"></i> {l10n.map.keygrid_sort_type}:
            </label>
            <select value={this.state.keyTypeFilter} onChange={e => this.handleChangeKeyTypeFilter(e)} className="custom-select d-inline-block w-auto" id="keyringFilterBtn">
              <option value="allkeys">{l10n.map.keygrid_all_keys}</option>
              <option value="publickeys">{l10n.map.keygrid_public_keys}</option>
              <option value="keypairs">{l10n.map.keyring_public_private}</option>
            </select>
          </div>
        </div>
        <div className="table-responsive table-responsive-custom">
          <table className="table table-custom table-striped table-hover" id="keyRingTable">
            <thead>
              <tr>
                <th></th>
                <th>{l10n.map.keygrid_user_name}</th>
                <th>{l10n.map.keygrid_user_email}</th>
                <th style={{minWidth: '140px'}}>{l10n.map.keygrid_keyid}</th>
                <th>{l10n.map.keygrid_creation_date_short}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {this.props.keys.map((key, index) =>
                !this.filterKey(key.type) &&
                <tr key={index} onClick={() => this.showKeyDetails(key.fingerprint)} onKeyPress={e => this.handleKeyPress(e, key.fingerprint)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    <i className={`icon icon-${key.type === 'public' ? 'key' : 'keyPair'}`}></i>
                  </td>
                  <td>{key.name}{this.props.defaultKeyFpr === key.fingerprint && <span>&nbsp;&nbsp;<span className="badge badge-warning">{l10n.map.keygrid_default_label}</span></span>}</td>
                  <td className="emailCell">{key.email}</td>
                  <td className="monospaced">{key.keyId}</td>
                  <td className="monospaced">{key.crDate.substr(0, 10)}</td>
                  <td className="text-center text-nowrap">
                    <div className="actions">
                      <button type="button" className="btn btn-secondary keyDetailsBtn" aria-haspopup="true"><i className="fa fa-info-circle" aria-hidden="true"></i></button>
                      {!(this.context.gnupg && key.type === 'private') && <button type="button" onClick={e => this.deleteKeyEntry(e, key.fingerprint)} className="btn btn-secondary keyDeleteBtn"><i className="fa fa-trash-o" aria-hidden="true"></i></button>}
                    </div>
                  </td>
                </tr>
              )
              }
            </tbody>
          </table>
        </div>
        {this.props.spinner && <Spinner delay={0} />}
        <Modal isOpen={this.state.showExportModal} toggle={() => this.setState(prevState => ({showExportModal: !prevState.showExportModal}))} size="medium" title={l10n.map.keyring_backup} hideFooter={true}>
          <KeyringOptions.Consumer>
            {({keyringId}) => <KeyExport showArmored={false} fileNameEditable={true} keyringId={keyringId} keyFprs={this.state.keyringBackup.keyFprs} keyName="keyring" all={this.state.keyringBackup.all} type={this.state.keyringBackup.type} publicOnly={this.context.gnupg} onClose={() => this.setState({showExportModal: false})} />}
          </KeyringOptions.Consumer>
        </Modal>
      </div>
    );
  }
}

KeyGrid.contextType = KeyringOptions;

KeyGrid.propTypes = {
  keys: PropTypes.array,
  defaultKeyFpr: PropTypes.string,
  onChangeDefaultKey: PropTypes.func.isRequired,
  onDeleteKey: PropTypes.func,
  onRefreshKeyring: PropTypes.func,
  spinner: PropTypes.bool
};
