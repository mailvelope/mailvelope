/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as l10n from '../../lib/l10n';

l10n.register([
  'keyring_setup',
  'keyring_setup_no_keypair_heading',
  'keyring_setup_no_keypair',
  'keyring_setup_generate_key',
  'keyring_setup_generate_key_explanation',
  'keyring_setup_generate_key',
  'keyring_setup_import_key',
  'keyring_setup_import_key_explanation',
  'keyring_setup_import_key'
]);

export default class KeyringSetup extends React.Component {
  render() {
    return (
      <div>
        <h3 className="logo-header">
          <span>{l10n.map.keyring_setup}</span>
        </h3>
        <form className="form">
          <p className={`alert alert-warning keyring_setup_message ${this.props.hasPrivateKey ? '' : 'active'}`}>
            <strong>{l10n.map.keyring_setup_no_keypair_heading}</strong><br/>
            <span>{l10n.map.keyring_setup_no_keypair}</span>
          </p>
          <h4>{l10n.map.keyring_setup_generate_key}</h4>
          <p>{l10n.map.keyring_setup_generate_key_explanation}</p>
          <p>
            <Link to="/keyring/generate" className="btn btn-primary">{l10n.map.keyring_setup_generate_key}</Link></p>
          <hr/>
          <h4>{l10n.map.keyring_setup_import_key}</h4>
          <p>{l10n.map.keyring_setup_import_key_explanation}</p>
          <Link to="/keyring/import" className="btn btn-primary">{l10n.map.keyring_setup_import_key}</Link>
        </form>
      </div>
    );
  }
}

KeyringSetup.propTypes = {
  hasPrivateKey: PropTypes.bool
};
