/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';

import './Terminate.scss';

export default function Terminate() {
  return (
    <div className="terminate">
      <div className="backdrop"></div>
      <div className="symbol"><span className="icon icon-bolt" /></div>
    </div>
  );
}
