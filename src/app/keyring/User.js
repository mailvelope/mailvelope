/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Link} from 'react-router-dom';
import moment from 'moment';
import {PGP_KEYSTATUS_VALID} from '../../lib/constants';
import {checkEmail} from '../../lib/util';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import NameAddrInput from './components/NameAddrInput';
import UserSignatures from './components/UserSignatures';
import KeyStatus from './components/KeyStatus';
import Spinner from '../../components/util/Spinner';
import Modal from '../../components/util/Modal';
import Alert from '../../components/util/Alert';

l10n.register([
  'user_title',
  'user_create_btn',
  'user_create_title',
  'user_remove_btn',
  'user_remove_btn_title',
  'user_revoke_btn',
  'user_revoke_btn_title',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_validity_status',
  'keydetails_creation_date',
  'keydetails_expiration_date',
  'keydetails_key_not_expire',
  'user_keyserver_sync',
  'user_keyserver_unverified',
  'user_keyserver_not',
  'user_keyserver_remove_btn',
  'user_keyserver_resend_confirmation_btn',
  'key_keyserver_upload_btn',
  'key_keyserver_resend_btn',
  'user_remove_dialog_title',
  'user_remove_dialog_confirmation',
  'user_remove_dialog_keyserver_warning',
  'user_revoke_dialog_title',
  'user_revoke_dialog_description',
  'user_revoke_dialog_confirmation',
  'dialog_yes_btn',
  'dialog_no_btn'
]);

// set locale
moment.locale(navigator.language);

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
        <span className="mr-2">{data.text}</span>
        {(this.state.keyDetails.validity && data.btnText && (this.state.user.remote || this.state.user.status === PGP_KEYSTATUS_VALID)) && <button type="button" onClick={() => this.handleKeyServerSync(data.handler)} className="btn btn-sm btn-secondary mr-1">{data.btnText}</button>}
        {(this.state.user.remote && !this.state.syncAction) && <button type="button" onClick={() => this.handleKeyServerSync({sync: false})} className="btn btn-sm btn-secondary">{l10n.map.user_keyserver_remove_btn}</button>}
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
          <ol className="breadcrumb bg-transparent p-0 mb-0">
            <li className="breadcrumb-item"><Link to={`/keyring/key/${this.props.match.params.keyFpr}`} replace tabIndex="0"><i className="icon icon-left" aria-hidden="true"></i> {this.state.keyDetails.name}</Link></li>
          </ol>
        </nav>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <div className="card-title d-flex align-items-center justify-content-between flex-wrap">
              <div className="d-inline-flex text-nowrap">
                {this.props.match.params.userIdx !== 'add' ? (
                  <h2>{l10n.map.user_title} <KeyStatus className="ml-1" status={this.state.user.status} /></h2>
                ) : (
                  <h2>{l10n.map.user_create_title}</h2>
                )}
              </div>
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
        <Modal isOpen={this.state.showDeleteModal} toggle={() => this.setState(prevState => ({showDeleteModal: !prevState.showDeleteModal}))} size="small" title={l10n.map.user_remove_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
          <div>
            <p>{l10n.map.user_remove_dialog_confirmation}</p>
            {this.state.user.remote &&
              <Alert type="warning" header={l10n.map.header_warning}>
                {l10n.map.user_remove_dialog_keyserver_warning}
              </Alert>
            }
            <div className="row no-gutters">
              <div className="col-6 pr-1">
                <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showDeleteModal: false})}>{l10n.map.dialog_no_btn}</button>
              </div>
              <div className="col-6 pl-1">
                <button type="button" onClick={() => this.setState({action: 'delete', showDeleteModal: false})} className="btn btn-primary btn-block">{l10n.map.dialog_yes_btn}</button>
              </div>
            </div>
          </div>
        </Modal>
        <Modal isOpen={this.state.showRevokeModal} toggle={() => this.setState(prevState => ({showRevokeModal: !prevState.showRevokeModal}))} size="small" title={l10n.map.user_revoke_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
          <div>
            <p>{l10n.map.user_revoke_dialog_description}</p>
            <p><strong>{l10n.map.user_revoke_dialog_confirmation}</strong></p>
            <div className="row no-gutters">
              <div className="col-6 pr-1">
                <button type="button" className="btn btn-secondary btn-block" onClick={() => this.setState({showRevokeModal: false})}>{l10n.map.dialog_no_btn}</button>
              </div>
              <div className="col-6 pl-1">
                <button type="button" onClick={() => this.setState({action: 'revoke', showRevokeModal: false})} className="btn btn-primary btn-block">{l10n.map.dialog_yes_btn}</button>
              </div>
            </div>
          </div>
        </Modal>
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
