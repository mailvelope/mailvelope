/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

'use strict';

l10n.register([
  'key_gen_pwd',
  'key_gen_pwd_empty',
  'key_gen_pwd_reenter',
  'key_gen_pwd_unequal',
  'key_gen_pwd_match'
]);

const labelVisibility = (password, passwordCheck) => {
  const mask = (passwordCheck.length > 0) << 1 | (password.length > 0);
  const label = {empty: '', nequ: '', match: ''};
  switch (mask) {
    case 0:
      // both empty
      label.nequ = 'hide';
      label.match = 'hide';
      break;
    case 1:
    case 2:
      // re-enter or enter empty
      label.empty = 'hide';
      label.match = 'hide';
      break;
    case 3:
      // both filled
      label.empty = 'hide';
      if (passwordCheck === password) {
        label.nequ = 'hide';
      } else {
        label.match = 'hide';
      }
      break;
  }
  return label;
}

const DefinePassword = ({value: {password, passwordCheck}, onChange, disabled}) => {
  const visibility = labelVisibility(password, passwordCheck);
  return (
    <div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">{l10n.map.key_gen_pwd}</label>
        <input value={password} onChange={onChange} type="password" className="form-control" id="password" disabled={disabled} />
        <span className={`label label-danger ${visibility.empty}`}>{l10n.map.key_gen_pwd_empty}</span>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="passwordCheck">{l10n.map.key_gen_pwd_reenter}</label>
        <input value={passwordCheck} onChange={onChange} type="password" className="form-control" id="passwordCheck" disabled={disabled} />
        <span className={`label label-danger ${visibility.nequ}`}>{l10n.map.key_gen_pwd_unequal}</span>
        <span className={`label label-success ${visibility.match}`}>{l10n.map.key_gen_pwd_match}</span>
      </div>
    </div>
  );
};

DefinePassword.propTypes = {
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
}

export default DefinePassword;
