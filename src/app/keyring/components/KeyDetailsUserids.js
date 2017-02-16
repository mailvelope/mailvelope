/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';

'use strict';

l10n.register([
  'keygrid_userid',
  'keygrid_userid_signatures',
  'keygrid_signer_name',
  'keygrid_keyid',
  'keygrid_creation_date_short'
]);

class KeyDetailsUserids extends React.Component {
  constructor(props) {
    super(props);
    const userID = props.users[0] && props.users[0].userID || '';
    this.state = {userID};
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({userID: event.target.value});
  }

  render() {
    const selected = this.props.users.find(user => user.userID === this.state.userID);
    return (
      <form className="form-horizontal" role="form">
        <div className="form-group">
          <label htmlFor="userIdsList" className="col-sm-3 control-label">{l10n.map.keygrid_userid}</label>
          <div className="col-sm-9">
            <select className="form-control" id="userIdsList" value={this.state.id} onChange={this.handleChange}>
              {this.props.users.map((user, index) =>
                <option value={user.userID} key={index}>{user.userID}</option>
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
                {selected.signatures.map(sgn =>
                  <tr key={sgn.id + sgn.crDate}>
                    <td>{sgn.signer}</td>
                    <td>{sgn.id}</td>
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
  users: React.PropTypes.array
}

export default KeyDetailsUserids;
