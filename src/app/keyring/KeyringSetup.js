/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as l10n from '../../lib/l10n';
import {KeyringOptions} from './KeyringOptions';
import KeyringSelect from './components/KeyringSelect';

l10n.register([
  'general_openpgp_preferences',
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

export default function KeyringSetup({hasPrivateKey, keyringAttr, onChangeKeyring, prefs}) {
  const context = React.useContext(KeyringOptions);
  return (
    <div className="card-body">
      <div className="card-title d-flex flex-wrap align-items-center">
        <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_setup}</h1>
        <div className="flex-shrink-0">
          <KeyringSelect keyringId={context.keyringId} keyringAttr={keyringAttr} onChange={onChangeKeyring} prefs={prefs} />
        </div>
      </div>
      <form className="form">
        <p className={`alert alert-warning keyring_setup_message ${hasPrivateKey ? '' : 'active'}`}>
          <strong>{l10n.map.keyring_setup_no_keypair_heading}</strong><br />
          <span>{l10n.map.keyring_setup_no_keypair}</span>
        </p>
        <h3>{l10n.map.keyring_setup_generate_key}</h3>
        <p>{l10n.map.keyring_setup_generate_key_explanation}</p>
        <p>
          <Link to="/keyring/generate" className="btn btn-primary">{l10n.map.keyring_setup_generate_key}</Link>
        </p>
        <hr />
        <h3>{l10n.map.keyring_setup_import_key}</h3>
        <p>{l10n.map.keyring_setup_import_key_explanation}</p>
        <p>
          <Link to="/keyring/import" className="btn btn-primary">{l10n.map.keyring_setup_import_key}</Link>
        </p>
        <hr />
        <h3>{l10n.map.gnupg_connection}</h3>
        <p>{l10n.map.keyring_available_settings} <Link to="/settings/general">{l10n.map.general_openpgp_preferences}</Link></p>
      </form>
    </div>
  );
}

KeyringSetup.propTypes = {
  hasPrivateKey: PropTypes.bool,
  keyringAttr: PropTypes.object,
  prefs: PropTypes.object,
  onChangeKeyring: PropTypes.func.isRequired
};
