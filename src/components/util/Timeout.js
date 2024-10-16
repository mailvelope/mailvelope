/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';

import './Timeout.scss';

export default function Timeout() {
  return (
    <div className="timeout">
      <div className="backdrop"></div>
      <div className="symbol"><span className="icon icon-hourglass-bottom" /></div>
    </div>
  );
}
