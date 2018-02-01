/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ActionMenuWrapper from './components/ActionMenuWrapper';

document.addEventListener('DOMContentLoaded', init);

function init() {
  const root = document.createElement('div');
  ReactDOM.render(
    (<ActionMenuWrapper />),
    document.body.appendChild(root)
  );
}
