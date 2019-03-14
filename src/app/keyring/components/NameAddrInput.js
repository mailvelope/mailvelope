/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';
import {KeyringOptions} from '../KeyringOptions';

l10n.register([
  'keygrid_user_name',
  'key_gen_name_help',
  'keygrid_user_email',
  'key_gen_invalid_email',
  'key_gen_demail',
  'nameaddrinput_error_name_empty',
  'nameaddrinput_error_email_exists'
]);

export default function NameAddrInput({name, email, onChange, disabled, errors = {}}) {
  return (
    <KeyringOptions.Consumer>
      {({demail}) => (
        <>
          <div className="form-group">
            <label htmlFor="name">{l10n.map.keygrid_user_name}</label>
            <input type="text" value={name} className={`form-control ${errors.name ? 'is-invalid' : ''}`} id="name" onChange={onChange} disabled={disabled} aria-describedby="nameHelpBlock" />
            {errors.name ? (
              <div className="invalid-feedback">{l10n.map.nameaddrinput_error_name_empty}</div>
            ) : (
              <small id="nameHelpBlock" className="form-text text-muted">{l10n.map.key_gen_name_help}</small>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="email">{demail ? l10n.map.key_gen_demail : l10n.map.keygrid_user_email}</label>
            <input type="text" value={email} className={`form-control ${errors.email ? 'is-invalid' : ''}`} id="email" onChange={onChange} disabled={disabled || demail} />
            {errors.email && <div className="invalid-feedback">{errors.email && errors.email.exists ? l10n.map.nameaddrinput_error_email_exists : l10n.map.key_gen_invalid_email}</div>}
          </div>
        </>
      )}
    </KeyringOptions.Consumer>
  );
}

NameAddrInput.propTypes = {
  name: PropTypes.string,
  email: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  errors: PropTypes.object
};
