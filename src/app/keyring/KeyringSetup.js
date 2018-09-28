/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as l10n from '../../lib/l10n';
import {AppOptions} from '../app';

l10n.register([
  'general_openpgp_preferences',
  'gnupg_available',
  'gnupg_connection',
  'keyring_available_settings',
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

export default function KeyringSetup({hasPrivateKey}) {
  return (
    <div>
      <h3 className="logo-header">
        <span>{l10n.map.keyring_setup}</span>
      </h3>
      <form className="form">
        <p className={`alert alert-warning keyring_setup_message ${hasPrivateKey ? '' : 'active'}`}>
          <strong>{l10n.map.keyring_setup_no_keypair_heading}</strong><br />
          <span>{l10n.map.keyring_setup_no_keypair}</span>
        </p>
        <h4>{l10n.map.keyring_setup_generate_key}</h4>
        <p>{l10n.map.keyring_setup_generate_key_explanation}</p>
        <p>
          <Link to="/keyring/generate" className="btn btn-primary">{l10n.map.keyring_setup_generate_key}</Link>
        </p>
        <hr />
        <h4>{l10n.map.keyring_setup_import_key}</h4>
        <p>{l10n.map.keyring_setup_import_key_explanation}</p>
        <p>
          <Link to="/keyring/import" className="btn btn-primary">{l10n.map.keyring_setup_import_key}</Link>
        </p>
        <AppOptions.Consumer>
          {options => options.gnupg &&
            <>
              <hr />
              <h4>{l10n.map.gnupg_connection}<span style={{marginLeft: '10px'}} className="label label-success">{l10n.map.gnupg_available}</span></h4>
              <p>{l10n.map.keyring_available_settings} <Link to="/settings/general">{l10n.map.general_openpgp_preferences}</Link></p>
            </>
          }
        </AppOptions.Consumer>
      </form>
    </div>
  );
}

KeyringSetup.propTypes = {
  hasPrivateKey: PropTypes.bool
};
