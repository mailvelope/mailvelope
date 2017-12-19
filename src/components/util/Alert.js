/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Alert
 */
export default function Alert({header, message, type}) {
  return (
    <div className={`alert fade in alert-${type}`}>
      {header && <strong>{`${header} `}</strong>}
      <span>{message}</span>
    </div>
  );
}

Alert.propTypes = {
  header: PropTypes.string,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'danger'])
};
