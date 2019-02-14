/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Alert
 */
export default function Alert({header, children: message, type}) {
  return (
    <div className={`alert fade in alert-${type}`}>
      {header && <strong>{`${header} `}</strong>}
      {message}
    </div>
  );
}

Alert.propTypes = {
  header: PropTypes.string,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'danger'])
};
