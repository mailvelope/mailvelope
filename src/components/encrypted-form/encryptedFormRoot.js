/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import EncryptedForm from './encryptedForm';

document.addEventListener('DOMContentLoaded', init);

l10n.mapToLocal();

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const query = new URLSearchParams(document.location.search);
  // component id
  const id = query.get('id' || '');
  // component used as a container (client API)
  const root = document.createElement('div');
  ReactDOM.render(<EncryptedForm id={id} />, document.body.appendChild(root));
}
