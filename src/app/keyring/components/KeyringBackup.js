/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

import Modal from '../../../components/util/Modal';
import {KeyringOptions} from '../KeyringOptions';
import KeyExport from './KeyExport';

l10n.register([
  'keyring_backup',
  'dialog_popup_close'
]);

export default function KeyringBackup(props) {
  return (
    <Modal title={l10n.map.keyring_backup} onHide={props.onHide} hideFooter={true}>
      <div style={{padding: '10px'}}>
        <KeyringOptions.Consumer>
          {({keyringId}) => <KeyExport keyringId={keyringId} keyFprs={props.keyFprs} keyName="keyring" all={props.all} type={props.type} publicOnly={props.publicOnly} />}
        </KeyringOptions.Consumer>
      </div>
    </Modal>
  );
}

KeyringBackup.propTypes = {
  keyFprs: PropTypes.array.isRequired,
  all: PropTypes.bool,
  onHide: PropTypes.func,
  type: PropTypes.string,
  publicOnly: PropTypes.bool
};
