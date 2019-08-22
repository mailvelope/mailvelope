/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Alert
 */
export default function Alert({className, id, header, children: message, type}) {
  return (
    <div id={id} className={`alert alert-${type} fade show ${className || ''}`} role="alert">
      {header && <strong>{`${header} `}</strong>}
      {message}
    </div>
  );
}

Alert.propTypes = {
  className: PropTypes.string,
  id: PropTypes.string,
  header: PropTypes.string,
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'danger']),
};

Alert.defaultProps = {
  type: 'info'
};
