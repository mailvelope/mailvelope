/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import KeyStatus from './KeyStatus';
import {KeyringOptions} from './../KeyringOptions';

import './KeyUsers.css';

l10n.register([
  'keyusers_title',
  'keyusers_add_btn',
  'keyusers_add_btn_title',
  'keyusers_keyserver',
  'keyusers_keyserver_sync',
  'keyusers_keyserver_not',
  'keyusers_keyserver_unverified',
  'keygrid_user_primary',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_userid_signatures',
  'keygrid_validity_status'
]);

export default class KeyUsers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedUser: null,
      allowSetPrimaryUser: false
    };
  }

  handleKeyPress(e, id) {
    if (e.key === 'Enter') {
      this.showUserDetails(e, id);
    }
  }

  showUserDetails(e, id) {
    if (e.target.nodeName !== 'INPUT') {
      this.setState({selectedUser: id});
    }
  }

  sortUsers(a, b) {
    const n = a.id - b.id;
    if (n != 0) {
      return n;
    }
    return b.isPrimary ? 0 : -1;
  }

  getKeyServerSyncLabel({remote, verified}) {
    const data = {
      labelClass: 'danger',
      statusText: l10n.map.keyusers_keyserver_not
    };
    if (remote) {
      if (verified) {
        data.labelClass = 'success';
        data.statusText = l10n.map.keyusers_keyserver_sync;
      } else {
        data.labelClass = 'warning';
        data.statusText = l10n.map.keyusers_keyserver_unverified;
      }
    }
    return (
      <span className="text-nowrap"><i className={`icon icon-marker text-${data.labelClass}`} aria-hidden="true"></i> {data.statusText}</span>
    );
  }

  render() {
    const showKeyServerStatus = this.props.users.some(user => user.remote);
    if (this.state.selectedUser !== null) {
      return <Redirect to={`/keyring/key/${this.props.keyFpr}/user/${this.state.selectedUser}`} />;
    }
    return (
      <div className={`keyUsers ${this.props.className || ''}`}>
        <div className="card card-clean-table">
          <div className="card-header d-flex align-items-center justify-content-between flex-wrap">
            <h3>{l10n.map.keyusers_title}</h3>
            {(!this.context.gnupg && this.props.keyType !== 'public' && this.props.keyValidity) &&
              <Link to={`/keyring/key/${this.props.keyFpr}/user/add`} className="btn btn-sm btn-secondary" replace tabIndex="0" title={l10n.map.keyusers_add_btn_title}>{l10n.map.keyusers_add_btn}</Link>
            }
          </div>
          <div className="table-responsive">
            <table className="table table-custom table-hover mb-0">
              <thead>
                <tr>
                  <th className="text-center">{l10n.map.keygrid_user_primary}</th>
                  <th>{l10n.map.keygrid_user_name}</th>
                  <th>{l10n.map.keygrid_user_email}</th>
                  <th className="text-center">{l10n.map.keygrid_validity_status}</th>
                  {showKeyServerStatus &&
                    <th className="text-center">{l10n.map.keyusers_keyserver}</th>
                  }
                  <th className="text-center">{l10n.map.keygrid_userid_signatures}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {this.props.users.sort(this.sortUsers).map(user =>
                  <tr key={user.id} onClick={e => this.showUserDetails(e, user.id)} onKeyPress={e => this.handleKeyPress(e, user.id)} tabIndex="0" aria-haspopup="true">
                    <td className="text-center">
                      {(this.props.keyType === 'private' && this.state.allowSetPrimaryUser) ? (
                        <label>
                          <input type="radio" onChange={e => this.props.onChangePrimaryUser(e.target.value)} name="isPrimaryUser" value={user.id} checked={user.isPrimary} />
                        </label>
                      ) : (
                        <i className={`${user.isPrimary && 'icon icon-checkmark'}`} aria-hidden="true"></i>
                      )}
                    </td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td className="text-center"><KeyStatus status={user.status} /></td>
                    {showKeyServerStatus &&
                      <td className="text-center">
                        {this.getKeyServerSyncLabel(user)}
                      </td>
                    }
                    <td className="text-center">{user.signatures.length}</td>
                    <td><i className="icon icon-right" aria-hidden="true"></i></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

KeyUsers.contextType = KeyringOptions;

KeyUsers.propTypes = {
  className: PropTypes.string,
  users: PropTypes.array,
  keyType: PropTypes.string,
  keyFpr: PropTypes.string,
  keyValidity: PropTypes.bool,
  onChangePrimaryUser: PropTypes.func
};
