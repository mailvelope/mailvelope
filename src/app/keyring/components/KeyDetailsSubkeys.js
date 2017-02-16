/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';

'use strict';

l10n.register([
  'keygrid_subkeyid',
  'keygrid_algorithm',
  'keygrid_key_length',
  'keygrid_creation_date',
  'keygrid_expiration_date',
  'keygrid_key_fingerprint',
  'keygrid_key_not_expire',
  'keygrid_no_subkeys'
]);

class KeyDetailsSubkeys extends React.Component {
  constructor(props) {
    super(props);
    const id = props.subkeys[0] && props.subkeys[0].id || '';
    this.state = {id};
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({id: event.target.value});
  }

  render() {
    const selected = this.props.subkeys.find(key => key.id === this.state.id);
    if (!selected) {
      return (
        <div className="alert alert-info">{l10n.map.keygrid_no_subkeys}</div>
      );
    }
    return (
      <form className="form-horizontal">
        <div className="form-group">
          <label htmlFor="subKeysList" className="col-sm-3 control-label">{l10n.map.keygrid_subkeyid}</label>
          <div className="col-sm-9">
            <select className="form-control" id="subKeysList" value={this.state.id} onChange={this.handleChange}>
              {this.props.subkeys.map(subkey =>
                <option value={subkey.id} key={subkey.fingerprint}>{subkey.id}</option>
              )}
            </select>
          </div>
        </div>
        <div className="tab-content">
          <div role="tabpanel" className="tab-pane well active">
            <div className="form-group">
              <label htmlFor="subkeyAlgorithm" className="col-sm-3 control-label">{l10n.map.keygrid_algorithm}</label>
              <div className="col-sm-9">
                <input type="text" value={selected.algorithm} readOnly className="form-control" id="subkeyAlgorithm" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="subkeyLength" className="col-sm-3 control-label">{l10n.map.keygrid_key_length}</label>
              <div className="col-sm-9">
                <input type="text" value={selected.bitLength} readOnly className="form-control" id="subkeyLength" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="subkeyCreationDate" className="col-sm-3 control-label">{l10n.map.keygrid_creation_date}</label>
              <div className="col-sm-9">
                <input type="text" value={selected.crDate.substr(0, 10)} readOnly className="form-control" id="subkeyCreationDate" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="subkeyExpirationDate" className="col-sm-3 control-label">{l10n.map.keygrid_expiration_date}</label>
              <div className="col-sm-9">
                <input type="text" value={selected.exDate ? selected.exDate.substr(0, 10) : l10n.map.keygrid_key_not_expire} readOnly className="form-control" id="subkeyExpirationDate" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="subkeyFingerPrint" className="col-sm-3 control-label">{l10n.map.keygrid_key_fingerprint}</label>
              <div className="col-sm-9">
                <input type="text" value={selected.fingerprint.match(/.{1,4}/g).join(' ')} readOnly className="form-control" id="subkeyFingerPrint" />
              </div>
            </div>
          </div>
        </div>
      </form>
    );
  }
}

KeyDetailsSubkeys.propTypes = {
  subkeys: React.PropTypes.array
}

export default KeyDetailsSubkeys;
