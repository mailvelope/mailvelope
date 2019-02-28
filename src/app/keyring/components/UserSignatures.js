/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import moment from 'moment';
import './UserSignatures.css';

l10n.register([
  'usersignatures_title',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_creation_date_short',
  'keygrid_keyid',
  'keygrid_signer_unknown'
]);

// set locale
moment.locale(navigator.language);

export default function UserSignatures({signatures}) {
  return (
    <div className="userSignatures">
      <div className="card">
        <div className="card-header">
          <h4 className="text-muted mb-0">{l10n.map.usersignatures_title}</h4>
        </div>
        <table className="table mb-0">
          <thead>
            <tr>
              <th>{l10n.map.keygrid_user_name}</th>
              <th>{l10n.map.keygrid_user_email}</th>
              <th>{l10n.map.keygrid_creation_date_short}</th>
              <th>{l10n.map.keygrid_keyid}</th>
            </tr>
          </thead>
          <tbody>
            {signatures.map((signature, index) =>
              <tr key={index}>
                <td>{signature.signer.name !== null ? signature.signer.name : l10n.map.keygrid_signer_unknown}</td>
                <td>{signature.signer.email !== null ? signature.signer.email : l10n.map.keygrid_signer_unknown}</td>
                <td>{moment(signature.crDate).format('L')}</td>
                <td>{signature.keyId}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

UserSignatures.propTypes = {
  signatures: PropTypes.array,
};
