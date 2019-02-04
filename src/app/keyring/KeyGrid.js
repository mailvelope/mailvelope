/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';

import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import Spinner from '../../components/util/Spinner';
import KeyDetails from './components/KeyDetails';
import KeyringBackup from './components/KeyringBackup';
import {Link} from 'react-router-dom';
import './KeyGrid.css';

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
      keyDetails: null,
      keyringBackup: null
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
    const key = this.props.keys[index];
    port.send('getKeyDetails', {fingerprint: key.fingerprint, keyringId: this.context.keyringId})
    .then(details => this.setState({keyDetails: {...key, ...details}}));
  }

  deleteKeyEntry(e, index) {
    e.stopPropagation();
    const deleteConfirm = confirm(l10n.map.keygrid_delete_confirmation);
    if (deleteConfirm) {
      const key = this.props.keys[index];
      this.props.onDeleteKey(key.fingerprint, key.type);
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
    this.setState({keyringBackup: {
      keyFprs: keys.map(key => key.fingerprint),
      all,
      type
    }});
  }

  render() {
    return (
      <div style={{minHeight: '300px'}}>
        <div className="table-responsive-custom">
          <div className="tableToolbar">
            <Link className="btn btn-default" to='/keyring/generate' replace tabIndex="0" title={l10n.map.keygrid_generate_title}>
              <span className="glyphicon glyphicon-plus-sign"></span>&nbsp;
              <span>{l10n.map.key_gen_generate}</span>
            </Link>
            <Link className="btn btn-default" to='/keyring/import' replace tabIndex="0" title={l10n.map.keygrid_import_title}>
              <span className="glyphicon glyphicon-import"></span>&nbsp;
              <span>{l10n.map.form_import}</span>
            </Link>
            <button type="button" onClick={() => this.openExportKeyringDialog()} className="btn btn-default" title={l10n.map.keygrid_export_title}>
              <span className="glyphicon glyphicon-export"></span>&nbsp;
              <span>{l10n.map.keygrid_export}</span>
            </button>
            <button type="button" onClick={this.props.onRefreshKeyring} className="btn btn-default" title={l10n.map.keygrid_refresh_title}>
              <span className="glyphicon glyphicon-refresh"></span>&nbsp;
              <span>{l10n.map.keygrid_refresh}</span>
            </button>

            <div className="pull-right form-inline" >
              <label htmlFor="keyringFilterBtn" className="keyringFilterLabel">
                <span className="glyphicon glyphicon-filter"></span>&nbsp;
                <span>{l10n.map.keygrid_sort_type}:</span>&nbsp;
              </label>
              <select value={this.state.keyTypeFilter} onChange={e => this.handleChangeKeyTypeFilter(e)} className="form-control" id="keyringFilterBtn" style={{marginBottom: '4px'}}>
                <option value="allkeys">{l10n.map.keygrid_all_keys}</option>
                <option value="publickeys">{l10n.map.keygrid_public_keys}</option>
                <option value="keypairs">{l10n.map.keyring_public_private}</option>
              </select>
            </div>
          </div>
          <table className="table table-striped table-hover optionsTable" id="keyRingTable">
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
                <tr key={index} onClick={() => this.showKeyDetails(index)} onKeyPress={e => this.handleKeyPress(e, index)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    <span className={key.type === 'public' ? 'publicKey' : 'keyPair'}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  </td>
                  <td>{key.name}{this.props.defaultKeyFpr === key.fingerprint && <span>&nbsp;&nbsp;<span className="label label-warning">{l10n.map.keygrid_default_label}</span></span>}</td>
                  <td className="emailCell">{key.email}</td>
                  <td className="monospaced">{key.keyId}</td>
                  <td className="monospaced">{key.crDate.substr(0, 10)}</td>
                  <td className="text-center text-nowrap">
                    <div className="actions">
                      <button type="button" className="btn btn-default keyDetailsBtn" aria-haspopup="true"><span className="glyphicon glyphicon-info-sign"></span></button>
                      {!(this.context.gnupg && key.type === 'private') && <button type="button" onClick={e => this.deleteKeyEntry(e, index)} className="btn btn-default keyDeleteBtn"><span className="glyphicon glyphicon-trash"></span></button>}
                    </div>
                  </td>
                </tr>
              )
              }
            </tbody>
          </table>
        </div>
        {this.props.spinner && <Spinner delay={0} />}
        {this.state.keyDetails &&
          <KeyDetails keyDetails={this.state.keyDetails}
            onSetDefaultKey={() => this.props.onChangeDefaultKey(this.state.keyDetails.fingerprint)}
            isDefault={this.props.defaultKeyFpr === this.state.keyDetails.fingerprint}
            onHide={() => this.setState({keyDetails: null})}
          />
        }
        {this.state.keyringBackup &&
          <KeyringBackup keyFprs={this.state.keyringBackup.keyFprs}
            all={this.state.keyringBackup.all}
            type={this.state.keyringBackup.type}
            onHide={() => this.setState({keyringBackup: null})}
            publicOnly={this.context.gnupg}
          />
        }
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
