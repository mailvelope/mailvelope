/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keygrid_no_userid',
  'keygrid_userid',
  'keygrid_userid_signatures',
  'keygrid_signer_name',
  'keygrid_keyid',
  'keygrid_creation_date_short'
]);

export default class KeyDetailsUserids extends React.Component {
  constructor(props) {
    super(props);
    const userId = props.users[0] && props.users[0].userId || '';
    this.state = {userId};
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({userId: event.target.value});
  }

  render() {
    if (!this.props.users.length) {
      return (
        <div className="alert alert-danger">{l10n.map.keygrid_no_userid}</div>
      );
    }
    const selected = this.props.users.find(user => user.userId === this.state.userId);
    return (
      <form className="form-horizontal" role="form">
        <div className="form-group">
          <label htmlFor="userIdsList" className="col-sm-3 control-label">{l10n.map.keygrid_userid}</label>
          <div className="col-sm-9">
            <select className="form-control" id="userIdsList" value={this.state.userId} onChange={this.handleChange}>
              {this.props.users.map((user, index) =>
                <option value={user.userId} key={index}>{user.userId}</option>
              )}
            </select>
          </div>
        </div>
        <div className="tab-content">
          <div role="tabpanel" className="tab-pane well active">
            <table className="table table-hover table-condensed table-striped optionsTable">
              <caption>{l10n.map.keygrid_userid_signatures}</caption>
              <thead>
                <tr>
                  <th>{l10n.map.keygrid_signer_name}</th>
                  <th>{l10n.map.keygrid_keyid}</th>
                  <th>{l10n.map.keygrid_creation_date_short}</th>
                </tr>
              </thead>
              <tbody>
                {selected.signatures.map((sgn, index) =>
                  <tr key={index}>
                    <td>{sgn.signer}</td>
                    <td>{sgn.keyId}</td>
                    <td style={{whiteSpace: 'nowrap'}}>{sgn.crDate.substr(0, 10)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    );
  }
}

KeyDetailsUserids.propTypes = {
  users: PropTypes.array
};
