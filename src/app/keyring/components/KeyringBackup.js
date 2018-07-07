/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

import ModalDialog from '../../../components/util/ModalDialog';
import KeyDetailsExport from './KeyDetailsExport';

l10n.register([
  'keyring_backup',
  'dialog_popup_close'
]);

export default function KeyringBackup(props) {
  return (
    <ModalDialog title={l10n.map.keyring_backup} onHide={props.onHide} footer={
      <button type="button" className="btn btn-primary" data-dismiss="modal">
        <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;{l10n.map.dialog_popup_close}
      </button>
    }>
      <div style={{padding: '10px'}}>
        <KeyDetailsExport keyFprs={props.keyFprs} keyName="keyring" all={props.all} type={props.type} />
      </div>
    </ModalDialog>
  );
}

KeyringBackup.propTypes = {
  keyFprs: PropTypes.array.isRequired,
  all: PropTypes.bool,
  onHide: PropTypes.func,
  type: PropTypes.string
};
