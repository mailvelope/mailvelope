/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';

import * as app from '../app';
import Spinner from '../../components/util/Spinner';
import KeyDetails from './components/KeyDetails';
import KeyringBackup from './components/KeyringBackup';

import './KeyGrid.css';

l10n.register([
  'keyring_header',
  'keygrid_export_title',
  'keygrid_export',
  'keygrid_all_keys',
  'keygrid_public_keys',
  'keyring_public_private',
  'keygrid_sort_type',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_keyid',
  'keygrid_creation_date_short',
  'keygrid_primary_label',
  'keygrid_delete_confirmation'
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
    app.keyring('getKeyDetails', {fingerprint: key.fingerprint})
    .then(details => this.setState({keyDetails: Object.assign({}, key, details)}));
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
      keyids: keys.map(key => key.fingerprint),
      all,
      type
    }});
  }

  render() {
    return (
      <div style={{minHeight: '300px'}}>
        <h3 className="logo-header">
          <span>{l10n.map.keyring_header}</span>
        </h3>
        <div className="table-responsive-custom">
          <div className="tableToolbar">
            <button type="button" onClick={() => this.openExportKeyringDialog()} className="btn btn-default" title={l10n.map.keygrid_export_title}>
              <span className="glyphicon glyphicon-export"></span>&nbsp;
              <span>{l10n.map.keygrid_export}</span>
            </button>
            <div className="pull-right form-inline" >
              <label htmlFor="keyringFilterBtn" style={{paddingTop: '7px', marginRight: '6px'}}>{l10n.map.keygrid_sort_type}</label>
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
              { this.props.keys.map((key, index) =>
                !this.filterKey(key.type) &&
                <tr key={index} onClick={() => this.showKeyDetails(index)} onKeyPress={e => this.handleKeyPress(e, index)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    <span className={key.type === 'public' ? 'publicKey' : 'keyPair'}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  </td>
                  <td>{key.name}{this.props.primaryKeyId === key.id && <span>&nbsp;&nbsp;<span className="label label-warning">{l10n.map.keygrid_primary_label}</span></span>}</td>
                  <td className="emailCell">{key.email}</td>
                  <td className="monospaced">{key.id}</td>
                  <td className="monospaced">{key.crDate.substr(0, 10)}</td>
                  <td className="text-center text-nowrap">
                    <div className="actions">
                      <button type="button" className="btn btn-default keyDetailsBtn" aria-haspopup="true"><span className="glyphicon glyphicon-info-sign"></span></button>
                      <button type="button" onClick={e => this.deleteKeyEntry(e, index)} className="btn btn-default keyDeleteBtn"><span className="glyphicon glyphicon-trash"></span></button>
                    </div>
                  </td>
                </tr>
              )
              }
            </tbody>
          </table>
        </div>
        {this.props.spinner && <Spinner style={{margin: '60px auto 60px'}} />}
        {this.state.keyDetails &&
          <KeyDetails keyDetails={this.state.keyDetails}
            onSetPrimaryKey={() => this.props.onChangePrimaryKey(this.state.keyDetails.id)}
            isPrimary={this.props.primaryKeyId === this.state.keyDetails.id}
            onHide={() => this.setState({keyDetails: null})}
          />
        }
        {this.state.keyringBackup &&
          <KeyringBackup keyids={this.state.keyringBackup.keyids}
            all={this.state.keyringBackup.all}
            type={this.state.keyringBackup.type}
            onHide={() => this.setState({keyringBackup: null})}
          />
        }
      </div>
    );
  }
}

KeyGrid.propTypes = {
  keys: PropTypes.array,
  primaryKeyId: PropTypes.string,
  onChangePrimaryKey: PropTypes.func.isRequired,
  onDeleteKey: PropTypes.func,
  spinner: PropTypes.bool
};
