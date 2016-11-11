/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../util/l10n';
import moment from 'moment';

import DatePicker from './DatePicker';

import './AdvKeyGenOptions.css';

'use strict';

l10n.register([
  'keygrid_algorithm',
  'key_gen_key_size',
  'key_gen_expiration',
  'keygrid_key_not_expire'
]);

const AdvKeyGenOptions = ({value: {keySize, keyExpirationTime}, onChange, disabled}) => {
  const handleDateChange = (moment) => onChange({target: {id: 'keyExpirationTime', value: moment}});
  return (
    <div className="adv-key-gen-options">
      <div className="form-group">
        <label className="control-label" htmlFor="genKeyAlgo">{l10n.map.keygrid_algorithm}</label>
        <select id="keyAlgo" className="form-control" disabled>
          <option>RSA/RSA</option>
          <option>DSA/ElGamal</option>
        </select>
      </div>
      <div className="form-group">
        <label className="control-label"><span htmlFor="genKeySize">{l10n.map.key_gen_key_size}</span>&nbsp;(<span>bits</span>)</label>
        <select id="keySize" value={keySize} onChange={onChange} className="form-control" disabled={disabled}>
          <option>2048</option>
          <option>4096</option>
        </select>
      </div>
      <div className="form-group key-expiration-group">
        <label className="control-label" htmlFor="keyExpirationTime">{l10n.map.key_gen_expiration}</label>
        <DatePicker id="keyExpirationTime" value={keyExpirationTime} onChange={handleDateChange} placeholder={l10n.map.keygrid_key_not_expire} minDate={moment().add({days: 1})} maxDate={moment('2080-12-31')} disabled={disabled} />
      </div>
      <div className="form-group">&nbsp;</div>
    </div>
  );
};

AdvKeyGenOptions.propTypes = {
  value: React.PropTypes.object.isRequired,
  onChange: React.PropTypes.func.isRequired,
  disabled: React.PropTypes.bool
}

export default AdvKeyGenOptions;
