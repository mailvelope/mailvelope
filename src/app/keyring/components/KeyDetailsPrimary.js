/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

'use strict';

l10n.register([
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_keyid',
  'keygrid_algorithm',
  'keygrid_key_length',
  'keygrid_creation_date',
  'keygrid_expiration_date',
  'keygrid_key_fingerprint',
  'keygrid_validity_status',
  'keygrid_status_valid',
  'keygrid_status_invalid',
  'keygrid_key_type',
  'keyring_keypair',
  'keyring_public',
  'keygrid_key_not_expire'
]);

function KeyDetailsPrimary({keyDetails}) {
  const isPrivate = keyDetails.type === 'private';
  return (
    <form className="form-horizontal" role="form">
      <div className="form-group">
        <label htmlFor="keyName" className="col-sm-3 control-label">{l10n.map.keygrid_user_name}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.name} readOnly className="form-control" id="keyName" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyEmail" className="col-sm-3 control-label">{l10n.map.keygrid_user_email}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.email} readOnly className="form-control" id="keyEmail" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyId" className="col-sm-3 control-label">{l10n.map.keygrid_keyid}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.id} readOnly className="form-control" id="keyId" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyAlgorithm" className="col-sm-3 control-label">{l10n.map.keygrid_algorithm}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.algorithm} readOnly className="form-control" id="keyAlgorithm" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyLength" className="col-sm-3 control-label">{l10n.map.keygrid_key_length}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.bitLength} readOnly className="form-control" id="keyLength" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyCreationDate" className="col-sm-3 control-label">{l10n.map.keygrid_creation_date}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.crDate.substr(0, 10)} readOnly className="form-control" id="keyCreationDate" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyExpirationDate" className="col-sm-3 control-label">{l10n.map.keygrid_expiration_date}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.exDate ? keyDetails.exDate.substr(0, 10) : l10n.map.keygrid_key_not_expire} readOnly className="form-control" id="keyExpirationDate" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyFingerPrint" className="col-sm-3 control-label">{l10n.map.keygrid_key_fingerprint}</label>
        <div className="col-sm-9">
          <input type="text" value={keyDetails.fingerprint.match(/.{1,4}/g).join(' ')} readOnly className="form-control" id="keyFingerPrint" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="keyStatus" className="col-sm-3 control-label">{l10n.map.keygrid_validity_status}</label>
        <div className="col-sm-3" id="keyStatus" style={{paddingTop: '5px'}}>
          <span className={`label label-${keyDetails.validity ? 'success' : 'danger'}`}>{keyDetails.validity ? l10n.map.keygrid_status_valid : l10n.map.keygrid_status_invalid}</span>
        </div>
        <label htmlFor="keyType" className="col-sm-1 control-label">{l10n.map.keygrid_key_type}</label>
        <div className="col-sm-5" id="keyType" style={{paddingTop: '5px', whiteSpace: 'nowrap'}}>
          <span className={isPrivate ? 'keyPair' : 'publicKey'} style={{paddingLeft: '25px'}}><span>{isPrivate ? l10n.map.keyring_keypair : l10n.map.keyring_public}</span></span>
        </div>
      </div>
    </form>
  );
}

KeyDetailsPrimary.propTypes = {
  keyDetails: PropTypes.object
};

export default KeyDetailsPrimary;
