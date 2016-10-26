/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../util/l10n';
import React from 'react';

'use strict';

l10n.register([
  'keygrid_user_name',
  'key_gen_name_help',
  'keygrid_user_email',
  'key_gen_invalid_email',
  'key_gen_demail'
]);

const NameAddrInput = ({value: {name, email, errors = {}}, onChange, disabled, demail}) => {
  return (
    <div>
      <div className="form-group">
        <label className="control-label" htmlFor="name">{l10n.map.keygrid_user_name}</label>
        <input type="text" value={name} className="form-control" id="name" onChange={onChange} disabled={disabled} />
        <span className="help-block">{l10n.map.key_gen_name_help}</span>
      </div>
      <div className={'form-group' + (errors.email ? ' has-error' : '')}>
        <label className="control-label" htmlFor="email">{demail ? l10n.map.key_gen_demail : l10n.map.keygrid_user_email}</label>
        <input type="text" value={email} className="form-control" id="email" onChange={onChange} disabled={disabled || demail} />
        <span className={'help-block ' + (errors.email ? 'show' : 'hide')}>{l10n.map.key_gen_invalid_email}</span>
      </div>
    </div>
  );
};

NameAddrInput.propTypes = {
  value: React.PropTypes.object.isRequired,
  onChange: React.PropTypes.func.isRequired,
  disabled: React.PropTypes.bool,
  demail: React.PropTypes.bool
}

export default NameAddrInput;
