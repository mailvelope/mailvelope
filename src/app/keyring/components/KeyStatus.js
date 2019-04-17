/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keygrid_status_valid',
  'keygrid_status_invalid',
  'keygrid_status_revoked',
  'keygrid_status_expired'
]);

export default function KeyStatus({status, className = ''}) {
  let labelClass;
  let labelText;
  switch (status) {
    case 3:
      labelClass = 'success';
      labelText = l10n.map.keygrid_status_valid;
      break;
    case 2:
      labelClass = 'warning';
      labelText = l10n.map.keygrid_status_revoked;
      break;
    case 1:
      labelClass = 'warning';
      labelText = l10n.map.keygrid_status_expired;
      break;
    default:
      labelClass = 'danger';
      labelText = l10n.map.keygrid_status_invalid;
  }
  return (
    <span className={`${className} text-nowrap`}><span className={`icon icon-marker text-${labelClass}`} aria-hidden="true"></span> {labelText}</span>
  );
}

KeyStatus.propTypes = {
  status: PropTypes.number,
  className: PropTypes.string
};
