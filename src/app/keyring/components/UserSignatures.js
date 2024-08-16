/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {format} from 'date-fns';
import * as l10n from '../../../lib/l10n';
import {loadLocale} from '../../../lib/date';

l10n.register([
  'usersignatures_title',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_creation_date_short',
  'keygrid_keyid',
  'keygrid_signer_unknown'
]);

export default function UserSignatures({signatures}) {
  const [locale, setLocale] = useState();
  useEffect(() => { loadLocale(navigator.language).then(locale => setLocale(locale)); }, []);
  return (
    <div className="userSignatures">
      <div className="card card-clean-table">
        <div className="card-header">
          <h3>{l10n.map.usersignatures_title}</h3>
        </div>
        <div className="table-responsive">
          <table className="table table-custom mb-0">
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
                  <td>{format(signature.crDate, 'P', {locale})}</td>
                  <td>{signature.keyId}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

UserSignatures.propTypes = {
  signatures: PropTypes.array,
};
