/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import {MAX_FILE_UPLOAD_SIZE} from '../../lib/constants';
import {addDocumentTitle} from '../../lib/util';
import Editor from './editor';

import './editorRoot.css';

document.addEventListener('DOMContentLoaded', init);

l10n.register([
  'editor_header'
]);

l10n.mapToLocal();

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const query = new URLSearchParams(document.location.search);
  // indicator if editor runs in container or popup
  const embedded = Boolean(query.get('embedded'));
  // component id
  const id = query.get('id') || '';
  // attachment max file size
  const quota = parseInt(query.get('quota'));
  let maxFileUploadSize = MAX_FILE_UPLOAD_SIZE;
  if (query.quota && quota < maxFileUploadSize) {
    maxFileUploadSize = quota;
  }
  addDocumentTitle(l10n.map.editor_header);
  const root = document.createElement('div');
  ReactDOM.render(
    (<Editor id={id} embedded={embedded} maxFileUploadSize={maxFileUploadSize} recipientInput={!embedded} />),
    document.body.appendChild(root)
  );
}
