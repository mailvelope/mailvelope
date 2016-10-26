/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../util/l10n';
import React from 'react';

'use strict';

l10n.register([
  'keygrid_algorithm',
  'key_gen_key_size',
  'key_gen_expiration',
  'key_gen_expires_after'
]);

const AdvKeyGenOptions = ({value: {keySize, keyExpires, keyExpirationTime}, onChange, disabled}) => {
  return (
    <div>
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
      <div className="form-group">
        <label className="control-label" htmlFor="keyExpires">{l10n.map.key_gen_expiration}</label>
        <div className="form-inline">
          <div className="checkbox">
            <label>
              <input id="keyExpires" type="checkbox" checked={keyExpires} onChange={onChange} disabled={disabled} />
              <span>&nbsp;{l10n.map.key_gen_expires_after}</span>
            </label>
          </div>
          <div className="input-group">
            <input id="keyExpirationTime" type="text" className="form-control" value={keyExpirationTime} onChange={onChange} disabled={disabled} />
            <span className="input-group-btn">
              <button type="button" className="btn btn-default" disabled={disabled}>
                <i className="glyphicon glyphicon-calendar"></i>
              </button>
            </span>
          </div>
        </div>
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
