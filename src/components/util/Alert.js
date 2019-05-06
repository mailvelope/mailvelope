/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Alert
 */
export default function Alert({className, header, children: message, type}) {
  return (
    <div className={`alert alert-${type} fade show ${className || ''}`} role="alert">
      {header && <strong>{`${header} `}</strong>}
      {message}
    </div>
  );
}

Alert.propTypes = {
  className: PropTypes.string,
  header: PropTypes.string,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'danger']),
};

Alert.defaultProps = {
  type: 'info'
};
