/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';

'use strict';

const Alert = ({header, message, type}) => {
  return (
    <div className={'alert fade in alert-' + type}>
      {header && <strong>{header + ' '}</strong>}
      <span>{message}</span>
    </div>
  );
};

Alert.propTypes = {
  header: React.PropTypes.string,
  message: React.PropTypes.string.isRequired,
  type: React.PropTypes.oneOf(['success', 'info', 'warning', 'danger'])
}

export default Alert;
