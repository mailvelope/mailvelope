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
import KeyringSelect from './components/KeyringSelect';
import {Redirect, Link} from 'react-router-dom';
import './KeyGrid.scss';

l10n.register([
  'form_import',
  'keygrid_all_keys',
  'keygrid_creation_date_short',
  'keygrid_default_label',
  'keyring_confirm_deletion',
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
    this.rowRefs = {};
    const {keyId} = props.match.params;
    this.state = {
      keyTypeFilter: 'allkeys',
      selectedKey: null,
      activeKey: keyId ? keyId : null,
      activeKeyring: null,
      keyringBackup: null,
      showExportModal: false,
      showDeleteKeyModal: false,
      showDeleteKeyringModal: false
    };
    this.deleteKeyEntry = this.deleteKeyEntry.bind(this);
    this.deleteKeyring = this.deleteKeyring.bind(this);
  }

  componentDidMount() {
    this.scrollToKey();
  }

  componentDidUpdate(prevProps) {
    if (this.props.match.params.keyId !== prevProps.match.params.keyId) {
      this.setState({activeKey: this.props.match.params.keyId});
    }
    this.scrollToKey();
  }

  scrollToKey() {
    if (this.state.activeKey && this.rowRefs[this.state.activeKey]) {
      window.scrollTo({top: this.rowRefs[this.state.activeKey].offsetTop, behavior: 'smooth'});
    }
  }

  handleChangeKeyTypeFilter(e) {
    this.setState({activeKey: null, keyTypeFilter: e.target.value});
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

  deleteKeyEntry() {
    const key = this.props.keys.find(key => key.fingerprint === this.state.activeKey);
    this.setState({showDeleteKeyModal: false}, () => this.props.onDeleteKey(key.fingerprint, key.type));
  }

  deleteKeyring() {
    const keyringId = this.state.activeKeyring.id;
    this.setState({showDeleteKeyringModal: false}, () => this.props.onDeleteKeyring(keyringId));
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
    this.setState({activeKey: null, showExportModal: true, keyringBackup: {
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
        <div className="card-title d-flex flex-wrap align-items-center">
          <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_header}</h1>
          <div className="flex-shrink-0">
            <KeyringSelect keyringId={this.context.keyringId} keyringAttr={this.props.keyringAttr} onChange={this.props.onChangeKeyring} onDelete={(keyringId, keyringName) => this.setState({showDeleteKeyringModal: true, activeKeyring: {id: keyringId, name: keyringName}})} prefs={this.props.prefs} />
          </div>
        </div>
        <div className="form-group btn-toolbar justify-content-between" role="toolbar" aria-label="Toolbar with button groups">
          <div className="btn-bar">
            <Link className="btn btn-secondary" to='/keyring/generate' replace tabIndex="0" title={l10n.map.keygrid_generate_title}>
              <span className="icon icon-add" aria-hidden="true"></span> {l10n.map.key_gen_generate}
            </Link>
            <Link className="btn btn-secondary" to='/keyring/import' replace tabIndex="0" title={l10n.map.keygrid_import_title}>
              <span className="icon icon-download" aria-hidden="true"></span> {l10n.map.form_import}
            </Link>
            <button type="button" onClick={() => this.openExportKeyringDialog()} className="btn btn-secondary" title={l10n.map.keygrid_export_title}>
              <span className="icon icon-upload" aria-hidden="true"></span> {l10n.map.keygrid_export}
            </button>
            <button type="button" onClick={this.props.onRefreshKeyring} className="btn btn-secondary" title={l10n.map.keygrid_refresh_title}>
              <span className="icon icon-refresh" aria-hidden="true"></span> {l10n.map.keygrid_refresh}
            </button>
          </div>
          <div>
            <label htmlFor="keyringFilterBtn" className="keyringFilterLabel mr-1">
              <span className="icon icon-filter" aria-hidden="true"></span> {l10n.map.keygrid_sort_type}:
            </label>
            <select value={this.state.keyTypeFilter} onChange={e => this.handleChangeKeyTypeFilter(e)} className="custom-select d-inline-block w-auto" id="keyringFilterBtn">
              <option value="allkeys">{l10n.map.keygrid_all_keys}</option>
              <option value="publickeys">{l10n.map.keygrid_public_keys}</option>
              <option value="keypairs">{l10n.map.keyring_public_private}</option>
            </select>
          </div>
        </div>
        <div className="table-responsive table-responsive-custom">
          <table className="table table-custom table-hover" id="keyRingTable">
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
                <tr className={this.state.activeKey === key.keyId ? 'table-active' : ''} ref={ref => this.rowRefs[key.keyId] = ref} key={index} onClick={() => this.showKeyDetails(key.fingerprint)} onKeyPress={e => this.handleKeyPress(e, key.fingerprint)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    <span className={`icon icon-${key.type === 'public' ? 'key' : 'key-pair'}`} style={{fontSize: '1.25rem'}}></span>
                  </td>
                  <td><strong className="mr-2">{key.name}</strong>{this.props.defaultKeyFpr === key.fingerprint && <span className="badge badge-info text-nowrap" aria-hidden="true">{l10n.map.keygrid_default_label}</span>}</td>
                  <td className="emailCell">{key.email}</td>
                  <td className="monospaced">{key.keyId}</td>
                  <td className="monospaced">{key.crDate.substr(0, 10)}</td>
                  <td className="text-center text-nowrap">
                    <div className="actions">
                      {!(this.context.gnupg && key.type === 'private') && <button type="button" onClick={e => { e.stopPropagation(); this.setState({showDeleteKeyModal: true, activeKey: key.fingerprint}); }} className="btn btn-secondary keyDeleteBtn"><span className="icon icon-delete" aria-hidden="true"></span></button>}
                      <span className="icon icon-arrow-right" aria-hidden="true"></span>
                    </div>
                  </td>
                </tr>
              )
              }
            </tbody>
          </table>
        </div>
        {this.props.spinner && <Spinner delay={0} />}
        <Modal isOpen={this.state.showDeleteKeyModal} toggle={() => this.setState(prevState => ({showDeleteKeyModal: !prevState.showDeleteKeyModal}))} size="small" title={l10n.map.key_remove_dialog_title} hideFooter={true} onHide={() => this.setState({activeKey: null})}>
          <div>
            <p>{l10n.map.keygrid_delete_confirmation}</p>
            <div className="row btn-bar">
              <div className="col-6">
                <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showDeleteKeyModal: false})}>{l10n.map.dialog_no_btn}</button>
              </div>
              <div className="col-6">
                <button type="button" onClick={this.deleteKeyEntry} className="btn btn-primary btn-block">{l10n.map.dialog_yes_btn}</button>
              </div>
            </div>
          </div>
        </Modal>
        <Modal isOpen={this.state.showDeleteKeyringModal} toggle={() => this.setState(prevState => ({showDeleteKeyringModal: !prevState.showDeleteKeyringModal}))} size="small" title={l10n.map.key_remove_dialog_title} hideFooter={true} onHide={() => this.setState({activeKeyring: null})}>
          <div>
            <p>{l10n.get('keyring_confirm_deletion', this.state.activeKeyring && this.state.activeKeyring.name)}</p>
            <div className="row btn-bar">
              <div className="col-6">
                <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showDeleteKeyringModal: false})}>{l10n.map.dialog_no_btn}</button>
              </div>
              <div className="col-6">
                <button type="button" onClick={this.deleteKeyring} className="btn btn-primary btn-block">{l10n.map.dialog_yes_btn}</button>
              </div>
            </div>
          </div>
        </Modal>
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
  keyringAttr: PropTypes.object,
  prefs: PropTypes.object,
  onChangeKeyring: PropTypes.func.isRequired,
  onDeleteKeyring: PropTypes.func.isRequired,
  onChangeDefaultKey: PropTypes.func.isRequired,
  onDeleteKey: PropTypes.func,
  onRefreshKeyring: PropTypes.func,
  spinner: PropTypes.bool,
  location: PropTypes.object,
  match: PropTypes.object
};
