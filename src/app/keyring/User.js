/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Link} from 'react-router-dom';
import {PGP_KEYSTATUS_VALID} from '../../lib/constants';
import {checkEmail} from '../../lib/util';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import NameAddrInput from './components/NameAddrInput';
import UserSignatures from './components/UserSignatures';
import KeyStatus from './components/KeyStatus';
import Spinner from '../../components/util/Spinner';
import SimpleDialog from '../../components/util/SimpleDialog';
import Alert from '../../components/util/Alert';

l10n.register([
  'alert_header_warning',
  'key_keyserver_resend_btn',
  'key_keyserver_upload_btn',
  'keydetails_creation_date',
  'keydetails_expiration_date',
  'keygrid_user_email',
  'keygrid_user_name',
  'keygrid_validity_status',
  'user_create_btn',
  'user_create_title',
  'user_keyserver_not',
  'user_keyserver_remove_btn',
  'user_keyserver_resend_confirmation_btn',
  'user_keyserver_sync',
  'user_keyserver_unverified',
  'user_remove_btn',
  'user_remove_btn_title',
  'user_remove_dialog_confirmation',
  'user_remove_dialog_keyserver_warning',
  'user_remove_dialog_title',
  'user_revoke_btn',
  'user_revoke_btn_title',
  'user_revoke_dialog_confirmation',
  'user_revoke_dialog_description',
  'user_revoke_dialog_title',
  'user_title',
]);

export default class User extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      processing: false,
      syncAction: false,
      showDetails: false,
      exit: false,
      showDeleteModal: false,
      showRevokeModal: false,
      action: '',
      errors: {},
      userEmails: [],
      user: {
        name: '',
        email: ''
      },
      keyDetails: {
        ...props.keyData
      }
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRevoke = this.handleRevoke.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
    this.handleKeyServerSync = this.handleKeyServerSync.bind(this);
  }

  componentDidMount() {
    this.getKeyDetails(this.context);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyData !== prevProps.keyData) {
      this.getKeyDetails(this.context);
    }
  }

  async getKeyDetails({keyringId}) {
    let user;
    let allowToRemove = false;
    let allowToRevoke = false;
    const keyDetails = await port.send('getKeyDetails', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
    if (this.props.match.params.userIdx !== 'add') {
      const {signatures, userId, name, email, status} = keyDetails.users.find(user => user.id == this.props.match.params.userIdx);
      allowToRemove = ((keyDetails.users.filter(user => user.status === PGP_KEYSTATUS_VALID).length > 1) || status < PGP_KEYSTATUS_VALID) && this.state.keyDetails.status === PGP_KEYSTATUS_VALID;
      allowToRevoke = (keyDetails.users.filter(user => user.status === PGP_KEYSTATUS_VALID).length > 1) && status === PGP_KEYSTATUS_VALID;
      user = {
        signatures,
        userId,
        name,
        email,
        status
      };
      if (this.state.keyDetails.type === 'private') {
        const keyServerSync = await port.send('get-keyserver-sync', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
        const userIdRemoteStatus = keyServerSync.userIds[user.email];
        if (typeof userIdRemoteStatus !== 'undefined') {
          user.remote = true;
          user.verified = userIdRemoteStatus;
        } else {
          user.remote = false;
        }
      }
    }
    this.setState(prevState => ({
      allowToRemove,
      allowToRevoke,
      loading: false,
      userEmails: keyDetails.users.map(user => user.email),
      user: user ? user : prevState.user,
      keyDetails: {
        ...prevState.keyDetails,
      },
    }));
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err, user}) => {
      const {[target.id]: deleted, ...errors} = err;
      return {
        user: {
          ...user,
          [target.id]: target.value
        },
        errors
      };
    });
  }

  async handleAdd() {
    const errors = {};
    if (this.state.user.name.trim() === '') {
      errors.name = new Error();
    }
    const validEmail = checkEmail(this.state.user.email);
    if (!validEmail) {
      errors.email = {invalid: new Error()};
    } else {
      if (this.state.userEmails.includes(this.state.user.email)) {
        errors.email = {exists: new Error()};
      }
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }
    this.setState({processing: true});
    try {
      await port.send('add-user', {fingerprint: this.state.keyDetails.fingerprint, user: this.state.user, keyringId: this.context.keyringId});
      this.setState({exit: true}, () => this.props.onKeyringChange());
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
      this.setState({processing: false});
    }
  }

  async handleDelete() {
    this.setState({processing: true});
    try {
      await port.send('remove-user', {fingerprint: this.state.keyDetails.fingerprint, userId: this.state.user.userId, keyringId: this.context.keyringId});
      if (this.state.user.remote) {
        await this.handleKeyServerSync({sync: false});
      }
      this.setState({exit: true}, () => this.props.onKeyringChange());
    } catch (e) {
      this.setState({
        processing: false,
      });
      throw e;
    }
  }

  async handleRevoke() {
    this.setState({processing: true});
    try {
      await port.send('revoke-user', {fingerprint: this.state.keyDetails.fingerprint, userId: this.state.user.userId, keyringId: this.context.keyringId});
      this.props.onKeyringChange();
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
    } finally {
      this.setState({
        processing: false,
      });
    }
  }

  async handleHiddenModal() {
    switch (this.state.action) {
      case 'delete':
        await this.handleDelete();
        break;
      case 'revoke':
        await this.handleRevoke();
    }
  }

  async handleKeyServerSync({sync}) {
    this.setState({processing: true});
    try {
      await port.send('sync-keyserver', {emails: [this.state.user.email], fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, sync});
    } catch (e) {
      // e.g. keyserver not available
      console.log(e);
    }
    this.setState({
      syncAction: sync ? 'upload' : 'remove',
      processing: false
    });
  }

  getKeyServerSyncAlert() {
    let data;
    if (!this.state.syncAction) {
      if (this.state.user.remote) {
        if (this.state.user.verified) {
          data = {
            type: 'success',
            text: l10n.map.user_keyserver_sync
          };
        } else {
          data = {
            type: 'warning',
            text: l10n.map.user_keyserver_unverified,
            btnText: l10n.map.user_keyserver_resend_confirmation_btn,
            handler: {sync: true}
          };
        }
      } else {
        data = {
          type: 'danger',
          text: l10n.map.user_keyserver_not,
          btnText: l10n.map.key_keyserver_upload_btn,
          handler: {sync: true}
        };
      }
    } else {
      if (this.state.syncAction === 'upload') {
        data = {
          type: 'warning',
          text: l10n.get('user_keyserver_upload', this.state.user.email),
          btnText: l10n.map.key_keyserver_resend_btn,
          handler: {sync: true}
        };
      } else {
        data = {
          type: 'warning',
          text: l10n.get('user_keyserver_remove', this.state.user.email),
          btnText: l10n.map.key_keyserver_resend_btn,
          handler: {sync: false}
        };
      }
    }
    return (
      <Alert type={data.type}>
        <div className="d-flex align-items-center">
          <span className="flex-shrink-1 mr-4">{data.text}</span>
          <div className="btn-bar flex-md-shrink-0 flex-grow-1">
            {(this.state.keyDetails.validity && data.btnText && (this.state.user.remote || this.state.user.status === PGP_KEYSTATUS_VALID)) && <button type="button" onClick={() => this.handleKeyServerSync(data.handler)} className="btn btn-secondary mb-md-0">{data.btnText}</button>}
            {(this.state.user.remote && !this.state.syncAction) && <button type="button" onClick={() => this.handleKeyServerSync({sync: false})} className="btn btn-secondary mb-md-0">{l10n.map.user_keyserver_remove_btn}</button>}
          </div>
        </div>
      </Alert>
    );
  }

  render() {
    if (this.state.exit) {
      return <Redirect to={`/keyring/key/${this.props.match.params.keyFpr}`} />;
    }
    return (
      <div className="card-body user">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-transparent p-0">
            <li className="breadcrumb-item"><Link to={`/keyring/key/${this.props.match.params.keyFpr}`} replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {this.state.keyDetails.name}</Link></li>
          </ol>
        </nav>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <div className="card-title d-flex align-items-center justify-content-between flex-wrap">
              {this.props.match.params.userIdx !== 'add' ? (
                <h2 className="d-inline-flex align-items-center">{l10n.map.user_title} <KeyStatus className="small ml-2" status={this.state.user.status} /></h2>
              ) : (
                <h2>{l10n.map.user_create_title}</h2>
              )}
              {this.state.keyDetails.type !== 'public' &&
                <div className="btn-bar">
                  {this.props.match.params.userIdx === 'add' && <button type="button" onClick={this.handleAdd} className="btn btn-secondary">{l10n.map.user_create_btn}</button>}
                  {(!this.context.gnupg && this.props.match.params.userIdx !== 'add') &&
                    <>
                      <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-secondary" disabled={!this.state.allowToRemove} title={l10n.map.user_remove_btn_title}>{l10n.map.user_remove_btn}</button>
                      <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-secondary" disabled={!this.state.allowToRevoke} title={l10n.map.user_revoke_btn_title}>{l10n.map.user_revoke_btn}</button>
                    </>
                  }
                </div>
              }
            </div>
            <div className="row">
              <div className="col-md-6">
                {this.props.match.params.userIdx === 'add' ? (
                  <form>
                    <NameAddrInput name={this.state.user.name || ''} email={this.state.user.email || ''} onChange={this.handleChange} errors={this.state.errors} />
                  </form>
                ) : (
                  <dl className="row d-flex align-items-center">
                    <dt className="col-sm-3 mb-2">{l10n.map.keygrid_user_name}</dt>
                    <dd className="col-sm-9">{this.state.user.name}</dd>
                    <dt className="col-sm-3 mb-2">{l10n.map.keygrid_user_email}</dt>
                    <dd className="col-sm-9">{this.state.user.email}</dd>
                  </dl>
                )}
              </div>
            </div>
            {(this.props.match.params.userIdx !== 'add' && this.state.keyDetails.type !== 'public') &&
              this.getKeyServerSyncAlert()
            }
            {this.state.user.signatures && <UserSignatures signatures={this.state.user.signatures} />}
          </>
        )}
        {this.state.processing &&
          <Spinner fullscreen={true} delay={0} />
        }
        <SimpleDialog
          isOpen={this.state.showDeleteModal}
          toggle={() => this.setState(prevState => ({showDeleteModal: !prevState.showDeleteModal}))}
          onHide={this.handleHiddenModal}
          title={l10n.map.user_remove_dialog_title}
          onOk={() => this.setState({action: 'delete', showDeleteModal: false})}
          onCancel={() => this.setState({showDeleteModal: false})}
        >
          <p>{l10n.map.user_remove_dialog_confirmation}</p>
          {this.state.user.remote &&
            <Alert type="warning" header={l10n.map.alert_header_warning}>
              {l10n.map.user_remove_dialog_keyserver_warning}
            </Alert>
          }
        </SimpleDialog>
        <SimpleDialog
          isOpen={this.state.showRevokeModal}
          toggle={() => this.setState(prevState => ({showRevokeModal: !prevState.showRevokeModal}))}
          onHide={this.handleHiddenModal}
          title={l10n.map.user_revoke_dialog_title}
          onOk={() => this.setState({action: 'revoke', showRevokeModal: false})}
          onCancel={() => this.setState({showRevokeModal: false})}
        >
          <p>{l10n.map.user_revoke_dialog_description}</p>
          <p><strong>{l10n.map.user_revoke_dialog_confirmation}</strong></p>
        </SimpleDialog>
      </div>
    );
  }
}

User.contextType = KeyringOptions;

User.propTypes = {
  onKeyringChange: PropTypes.func,
  keyData: PropTypes.object,
  match: PropTypes.object,
};
