/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import moment from 'moment';
import * as l10n from '../../lib/l10n';
import {port} from '../app';

import {KeyringOptions} from './KeyringOptions';
import KeyUsers from './components/KeyUsers';
import KeyDetails from './components/KeyDetails';
import KeyExport from './components/KeyExport';
import DefaultKeyButton from './components/DefaultKeyButton';
import KeyStatus from './components/KeyStatus';
import Spinner from '../../components/util/Spinner';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';
import SimpleDialog from '../../components/util/SimpleDialog';

l10n.register([
  'keyring_header',
  'key_remove_btn',
  'key_export_btn',
  'key_revoke_btn',
  'key_remove_btn_title',
  'key_export_btn_title',
  'key_revoke_btn_title',
  'key_keyserver_sync',
  'key_keyserver_not',
  'key_keyserver_mod',
  'key_keyserver_upload',
  'key_keyserver_update',
  'key_keyserver_remove',
  'key_keyserver_remove_btn',
  'key_keyserver_upload_btn',
  'key_keyserver_update_btn',
  'key_keyserver_resend_btn',
  'key_remove_dialog_title',
  'key_export_dialog_title',
  'key_revoke_dialog_title',
  'key_revoke_dialog_description',
  'key_revoke_dialog_confirm',
  'key_revoke_dialog_confirm'
]);

// set locale
moment.locale(navigator.language);

export default class Key extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      processing: false,
      syncAction: false,
      showDeleteModal: false,
      showExportModal: false,
      showRevokeModal: false,
      action: '',
      exit: false,
      keyDetails: {
        ...props.keyData,
        users: [],
        subkeys: []
      },
      isDefault: props.defaultKeyFpr === props.keyData.fingerprint
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.handleDefaultClick = this.handleDefaultClick.bind(this);
    this.handleRevoke = this.handleRevoke.bind(this);
    this.handleSetExDate = this.handleSetExDate.bind(this);
    this.handleChangePwd = this.handleChangePwd.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
    this.validateKeyPassword = this.validateKeyPassword.bind(this);
    this.handleKeyServerSync = this.handleKeyServerSync.bind(this);
    this.getKeyServerSyncAlert = this.getKeyServerSyncAlert.bind(this);
  }

  componentDidMount() {
    this.getKeyDetails(this.context);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyData !== prevProps.keyData) {
      this.getKeyDetails(this.context);
    }
  }

  async getKeyDetails({keyringId, demail}) {
    const keyDetails = await port.send('getKeyDetails', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
    let keyServerSync = false;
    if (this.state.keyDetails.type === 'private') {
      keyServerSync = await port.send('get-keyserver-sync', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
      keyDetails.users = keyDetails.users.map(user => {
        const remote = keyServerSync.userIds[user.email];
        if (typeof remote !== 'undefined') {
          user.remote = true;
          user.verified = remote;
        } else {
          user.remote = false;
        }
        return user;
      });
    }
    this.setState({
      loading: false,
      keyDetails: {
        keyServerSync: demail ? false : keyServerSync,
        ...this.props.keyData,
        ...keyDetails
      }
    });
  }

  handleDefaultClick() {
    this.props.onChangeDefaultKey(this.state.keyDetails.fingerprint);
    this.setState({isDefault: true});
  }

  handleDelete() {
    this.setState({exit: true}, () => this.props.onDeleteKey(this.state.keyDetails.fingerprint, this.state.keyDetails.type));
  }

  async validateKeyPassword(password) {
    return port.send('validate-key-password', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, password});
  }

  async handleRevoke() {
    this.setState({processing: true});
    try {
      await port.send('revokeKey', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId});
      this.props.onKeyringChange();
    } finally {
      this.setState({
        processing: false,
        action: ''
      });
    }
  }

  async handleSetExDate(newExDateISOString) {
    this.setState({processing: true});
    try {
      await port.send('set-key-expiry-date', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, newExDateISOString});
      this.props.onKeyringChange();
    } catch (e) {
      console.log('Setting new expiry date failed.', e);
    } finally {
      this.setState({processing: false});
    }
  }

  async handleChangePwd(currentPassword, password) {
    this.setState({processing: true});
    try {
      await port.send('set-key-password', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, currentPassword, password});
      this.props.onKeyringChange();
    } finally {
      this.setState({processing: false});
    }
  }

  async handleHiddenModal() {
    switch (this.state.action) {
      case 'delete':
        this.handleDelete();
        break;
      case 'revoke':
        await this.handleRevoke();
    }
  }

  async handleKeyServerSync({sync}) {
    this.setState({processing: true});
    try {
      let emails = [];
      if (sync === 'update') {
        emails = this.state.keyDetails.users.filter(({remote}) => remote).map(({email}) => email);
        sync = true;
      }
      await port.send('sync-keyserver', {emails, fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, sync});
    } catch (e) {
      /* e.g. keyserver not available */
      console.log(e);
    }
    this.setState(prevState => ({
      syncAction: sync ? prevState.keyDetails.keyServerSync.status ? 'update' : 'upload' : 'remove',
      processing: false
    }));
  }

  getKeyServerSyncAlert() {
    let data;
    if (!this.state.syncAction) {
      switch (this.state.keyDetails.keyServerSync.status) {
        case 'sync':
          data = {
            type: 'success',
            text: l10n.map.key_keyserver_sync,
          };
          break;
        case 'mod':
          data = {
            type: 'warning',
            text: l10n.map.key_keyserver_mod,
            btnText: l10n.map.key_keyserver_update_btn,
            handler: {sync: 'update'}
          };
          break;
        default:
          data = {
            type: 'danger',
            text: l10n.map.key_keyserver_not,
            btnText: l10n.map.key_keyserver_upload_btn,
            handler: {sync: true}
          };
      }
    } else {
      switch (this.state.syncAction) {
        case 'upload':
          data = {
            type: 'warning',
            text: l10n.map.key_keyserver_upload,
            btnText: l10n.map.key_keyserver_resend_btn,
            handler: {sync: true}
          };
          break;
        case 'update':
          data = {
            type: 'warning',
            text: l10n.map.key_keyserver_update,
          };
          break;
        case 'remove':
          data = {
            type: 'warning',
            text: l10n.map.key_keyserver_remove,
            btnText: l10n.map.key_keyserver_resend_btn,
            handler: {sync: false}
          };
          break;
      }
    }
    return (
      <Alert type={data.type} className="mb-3">
        <div className="d-flex align-items-center">
          <span className="flex-shrink-1 mr-4">{data.text}</span>
          <div className="btn-bar flex-md-shrink-0 flex-grow-1">
            {(this.state.keyDetails.validity && data.btnText) && <button type="button" onClick={() => this.handleKeyServerSync(data.handler)} className="btn btn-secondary mb-md-0">{data.btnText}</button>}
            {(this.state.keyDetails.keyServerSync.status && !this.state.syncAction) && <button type="button" onClick={() => this.handleKeyServerSync({sync: false})} className="btn btn-secondary mb-md-0">{l10n.map.key_keyserver_remove_btn}</button>}
          </div>
        </div>
      </Alert>
    );
  }

  render() {
    if (this.state.exit) {
      return <Redirect to="/keyring" />;
    }
    return (
      <div className="card-body key">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-transparent p-0">
            <li className="breadcrumb-item"><Link to="/keyring" onClick={this.props.onKeyringChange} replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
          </ol>
        </nav>
        <div className="card-title d-flex align-items-center justify-content-between flex-wrap">
          <h2 className="d-inline-flex align-items-center">{this.state.keyDetails.name} <KeyStatus className="small ml-2" status={this.state.keyDetails.status} /></h2>
          <div className="btn-bar">
            {(!this.context.gnupg || this.state.keyDetails.type === 'public') && <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-secondary" title={l10n.map.key_remove_btn_title}>{l10n.map.key_remove_btn}</button>}
            <button type="button" onClick={() => this.setState({showExportModal: true})} className="btn btn-secondary" title={l10n.map.key_export_btn_title}>{l10n.map.key_export_btn}</button>
            {(!this.context.gnupg && this.state.keyDetails.type !== 'public') &&
              <>
                <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-secondary" disabled={!this.state.keyDetails.validity} title={l10n.map.key_revoke_btn_title}>{l10n.map.key_revoke_btn}</button>
                <DefaultKeyButton onClick={this.handleDefaultClick} isDefault={this.state.isDefault} disabled={!this.state.keyDetails.validDefaultKey} />
              </>
            }
          </div>
        </div>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <KeyUsers className="mb-3" keyFpr={this.props.match.params.keyFpr} keyType={this.state.keyDetails.type} keyValidity={this.state.keyDetails.validity} users={this.state.keyDetails.users} onChangePrimaryUser={userIdx => this.handleSetPrimaryUser(userIdx)} />
            {this.state.keyDetails.keyServerSync &&
              this.getKeyServerSyncAlert()
            }
            <KeyDetails keyDetails={this.state.keyDetails} onChangeExpDate={this.handleSetExDate} onValidateKeyPwd={this.validateKeyPassword} onChangePwd={this.handleChangePwd}></KeyDetails>
          </>
        )}
        <SimpleDialog
          isOpen={this.state.showDeleteModal}
          toggle={() => this.setState(prevState => ({showDeleteModal: !prevState.showDeleteModal}))}
          onHide={this.handleHiddenModal}
          title={l10n.map.key_remove_dialog_title}
          message={l10n.map.keygrid_delete_confirmation}
          onOk={() => this.setState({action: 'delete', showDeleteModal: false})}
          onCancel={() => this.setState({showDeleteModal: false})}
        />
        <SimpleDialog
          isOpen={this.state.showRevokeModal}
          toggle={() => this.setState(prevState => ({showRevokeModal: !prevState.showRevokeModal}))}
          onHide={this.handleHiddenModal}
          title={l10n.map.key_revoke_dialog_title}
          onOk={() => this.setState({action: 'revoke', showRevokeModal: false})}
          onCancel={() => this.setState({showRevokeModal: false})}
        >
          <p>{l10n.map.key_revoke_dialog_description}</p>
          <p><strong>{l10n.map.key_revoke_dialog_confirm}</strong></p>
        </SimpleDialog>
        <Modal isOpen={this.state.showExportModal} toggle={() => this.setState(prevState => ({showExportModal: !prevState.showExportModal}))} size="medium" title={l10n.map.key_export_dialog_title} hideFooter={true}>
          <KeyExport keyringId={this.context.keyringId} keyFprs={[this.state.keyDetails.fingerprint]} keyName={this.state.keyDetails.name} publicOnly={this.context.gnupg} onClose={() => this.setState({showExportModal: false})} />
        </Modal>
        {this.state.processing &&
          <Spinner fullscreen={true} delay={0} />
        }
      </div>
    );
  }
}

Key.contextType = KeyringOptions;

Key.propTypes = {
  keyData: PropTypes.object,
  getKeyDetails: PropTypes.func,
  defaultKeyFpr: PropTypes.string,
  onChangeDefaultKey: PropTypes.func,
  onKeyringChange: PropTypes.func,
  onDeleteKey: PropTypes.func,
  match: PropTypes.object
};
