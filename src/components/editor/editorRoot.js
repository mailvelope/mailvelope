/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import * as l10n from '../../lib/l10n';
import mvelo from '../../mvelo';
import Editor from './editor';

import './editorRoot.css';

document.addEventListener('DOMContentLoaded', init);

l10n.mapToLocal();

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const query = $.parseQuerystring();
  // indicator if editor runs in container or popup
  const embedded = Boolean(query.embedded);
  // component id
  const id = query.id;
  // attachment max file size
  let maxFileUploadSize = mvelo.MAX_FILE_UPLOAD_SIZE;
  if (query.quota && parseInt(query.quota) < maxFileUploadSize) {
    maxFileUploadSize = parseInt(query.quota);
  }
  const root = document.createElement('div');
  ReactDOM.render(
    (<Editor id={id} embedded={embedded} maxFileUploadSize={maxFileUploadSize} recipientInput={true} />),
    document.body.appendChild(root)
  );
}
