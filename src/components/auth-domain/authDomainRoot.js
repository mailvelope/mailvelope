/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import AuthDomain from './AuthDomain';

document.addEventListener('DOMContentLoaded', init);

l10n.mapToLocal();

function init() {
  const query = new URLSearchParams(document.location.search);
  // component id
  const id = query.get('id') || '';
  // component used as a container (client API)
  const root = document.createElement('div');
  ReactDOM.render(<AuthDomain id={id} />, document.body.appendChild(root));
}
