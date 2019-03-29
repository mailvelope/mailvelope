/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import moment from 'moment';
import {KeyringOptions} from '../KeyringOptions';
import DatePicker from './DatePicker';

l10n.register([
  'keygrid_algorithm',
  'keygrid_default_label',
  'key_gen_key_size',
  'key_gen_experimental',
  'key_gen_expiration',
  'key_gen_future_default',
  'keygrid_key_not_expire'
]);

export default function AdvKeyGenOptions({value: {keyAlgo, keySize, keyExpirationTime}, onChange, disabled}) {
  const handleDateChange = moment => onChange({target: {id: 'keyExpirationTime', value: moment}});
  const keyAlgos = [
    <option value="rsa" key={0}>RSA</option>,
    <option value="ecc" key={1}>{`ECC - Curve25519 (${l10n.map.key_gen_experimental})`}</option>
  ];
  const gpgKeyAlgos = [
    <option value="default" key={0}>{l10n.map.keygrid_default_label}</option>,
    <option value="future-default" key={1}>{`${l10n.map.key_gen_future_default} (${l10n.map.key_gen_experimental})`}</option>
  ];
  return (
    <div className="adv-key-gen-options">
      <div className="form-group">
        <label htmlFor="keyAlgo">{l10n.map.keygrid_algorithm}</label>
        <select id="keyAlgo" value={keyAlgo} onChange={onChange} className="custom-select" disabled={disabled}>
          <KeyringOptions.Consumer>
            {options => options.gnupg ? gpgKeyAlgos : keyAlgos}
          </KeyringOptions.Consumer>
        </select>
      </div>
      <div className={`form-group ${keyAlgo === 'rsa' ? '' : 'hide'}`}>
        <label htmlFor="keySize"><span htmlFor="keySize">{l10n.map.key_gen_key_size}</span>&nbsp;(<span>Bit</span>)</label>
        <select id="keySize" value={keySize} onChange={onChange} className="custom-select" disabled={disabled}>
          <option value="2048">2048 Bit</option>
          <option value="4096">4096 Bit</option>
        </select>
      </div>
      <div className="form-group key-expiration-group">
        <label htmlFor="keyExpirationTime">{l10n.map.key_gen_expiration}</label>
        <DatePicker id="keyExpirationTime" value={keyExpirationTime} onChange={handleDateChange} placeholder={l10n.map.keygrid_key_not_expire} minDate={moment().add({days: 1})} maxDate={moment('2080-12-31')} disabled={disabled} />
      </div>
    </div>
  );
}

AdvKeyGenOptions.propTypes = {
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
