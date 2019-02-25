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
import ModalDialog from '../../components/util/ModalDialog';
import Alert from '../../components/util/Alert';

import './User.css';

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
      this.processDelete = false;
      this.setState({
        processing: false,
        showDeleteModal: false
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
      this.processRevoke = false;
      this.setState({
        processing: false,
        showRevokeModal: false
      });
    }
  }

  handleHiddenModal() {
    if (this.processDelete) {
      this.handleDelete();
    } else if (this.processRevoke) {
      this.handleRevoke();
    } else {
      this.setState({
        showDeleteModal: false,
        showRevokeModal: false
      });
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
        <span className="margin-right-sm">{data.text}</span>
        {(this.state.keyDetails.validity && data.btnText && (this.state.user.remote || this.state.user.status === PGP_KEYSTATUS_VALID)) && <button type="button" onClick={() => this.handleKeyServerSync(data.handler)} className="margin-right-sm btn btn-sm btn-default">{data.btnText}</button>}
        {(this.state.user.remote && !this.state.syncAction) && <button type="button" onClick={() => this.handleKeyServerSync({sync: false})} className="btn btn-sm btn-default">{l10n.map.user_keyserver_remove_btn}</button>}
      </Alert>
    );
  }

  render() {
    if (this.state.exit) {
      return <Redirect to={`/keyring/key/${this.props.match.params.keyFpr}`} />;
    }
    return (
      <div className="user">
        <ol className="breadcrumb">
          <li><Link to={`/keyring/key/${this.props.match.params.keyFpr}`} replace tabIndex="0"><span className="glyphicon glyphicon-menu-left" aria-hidden="true"></span> {this.state.keyDetails.name}</Link></li>
        </ol>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <nav className="navbar">
              <div className="container-fluid">
                <div className="navbar-header">
                  <div className="navbar-brand">
                    {this.props.match.params.userIdx !== 'add' ? (
                      <>
                        <span>{l10n.map.user_title}</span>
                        <KeyStatus className="margin-left-sm" status={this.state.user.status} />
                      </>
                    ) : (
                      <span>{l10n.map.user_create_title}</span>
                    )}
                  </div>
                </div>
                {this.state.keyDetails.type !== 'public' &&
                  <div className="collapse navbar-collapse">
                    <div className="navbar-form navbar-right">
                      {this.props.match.params.userIdx === 'add' && <button type="button" onClick={this.handleAdd} className="btn btn-primary">{l10n.map.user_create_btn}</button>}
                      {(!this.context.gnupg && this.props.match.params.userIdx !== 'add') &&
                        <>
                          <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-default margin-left-sm" disabled={!this.state.allowToRemove} title={l10n.map.user_remove_btn_title}>{l10n.map.user_remove_btn}</button>
                          <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-default margin-left-sm" disabled={!this.state.allowToRevoke} title={l10n.map.user_revoke_btn_title}>{l10n.map.user_revoke_btn}</button>
                        </>
                      }
                    </div>
                  </div>
                }
              </div>
            </nav>
            <div className="row margin-bottom-md">
              <div className="col-sm-6">
                {this.props.match.params.userIdx === 'add' ? (
                  <form>
                    <NameAddrInput name={this.state.user.name || ''} email={this.state.user.email || ''} onChange={this.handleChange} errors={this.state.errors} />
                  </form>
                ) : (
                  <div className="form-horizontal margin-top-md">
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_user_name}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {this.state.user.name}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_user_email}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {this.state.user.email}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-sm-6 col-md-5 col-md-offset-1">
                {(this.props.match.params.userIdx !== 'add' && this.state.showDetails) &&
                  <div className="form-horizontal margin-top-md">
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_validity_status}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        <KeyStatus status={this.state.user.status} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keydetails_creation_date}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {moment(this.state.user.crDate).format('L')}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keydetails_expiration_date}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {this.state.user.exDate ? moment(this.state.user.exDate).format('L') : 'nie'}
                      </div>
                    </div>
                  </div>
                }
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
        {this.state.showDeleteModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title={l10n.map.user_remove_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>{l10n.map.user_remove_dialog_confirmation}</p>
              {this.state.user.remote &&
                <Alert type="warning" header={l10n.map.header_warning}>
                  {l10n.map.user_remove_dialog_keyserver_warning}
                </Alert>
              }
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">{l10n.map.dialog_no_btn}</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={() => this.processDelete = true} className="btn btn-primary btn-block" data-dismiss="modal">{l10n.map.dialog_yes_btn}</button>
                </div>
              </div>
            </div>
          </ModalDialog>
        }
        {this.state.showRevokeModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title={l10n.map.user_revoke_dialog_title} hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>{l10n.map.user_revoke_dialog_description}</p>
              <p><strong>{l10n.map.user_revoke_dialog_confirmation}</strong></p>
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">{l10n.map.dialog_no_btn}</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={() => this.processRevoke = true} className="btn btn-primary btn-block" data-dismiss="modal">{l10n.map.dialog_yes_btn}</button>
                </div>
              </div>
            </div>
          </ModalDialog>
        }
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
