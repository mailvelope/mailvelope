/**
 * Copyright (C) 2018-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import {formatFpr} from '../../../lib/util';
import Modal from '../../util/Modal';

l10n.register([
  'digital_signature_status_true',
  'digital_signature_status_false',
  'digital_signature_status_null',
  'digital_signature_status_null_description',
  'dialog_popup_close',
  'keygrid_key_fingerprint',
  'keygrid_user_email',
  'keygrid_user_name',
  'keygrid_validity_status'
]);

export default function SignatureModal({isOpen, signer, onHide, toggle}) {
  let status;
  let bgClass;
  if (signer && signer.valid === true) {
    bgClass = 'alert-success';
    status = l10n.map.digital_signature_status_true;
  } else if (signer && signer.valid === false) {
    bgClass = 'alert-danger';
    status = l10n.map.digital_signature_status_false;
  } else if (signer && signer.valid === null) {
    bgClass = 'alert-warning';
    status = l10n.map.digital_signature_status_null;
  }
  return (
    <Modal isOpen={isOpen} toggle={toggle} onHide={onHide} size="large" headerClass={bgClass}
      title={
        <>
          <strong>{l10n.map.keygrid_validity_status}:</strong> {status}
        </>
      }
      footer={
        <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={toggle}>{l10n.map.dialog_popup_close}</button></div>
      }
    >
      <div>
        {signer && (signer.valid !== null ? (
          <div>
            <p><b>{l10n.map.keygrid_user_name}:</b> {signer.keyDetails.name}</p>
            <p><b>{l10n.map.keygrid_user_email}:</b> {signer.keyDetails.email}</p>
            <p className="mb-0"><b>{l10n.map.keygrid_key_fingerprint}:</b> {formatFpr(signer.keyDetails.fingerprint)}</p>
          </div>
        ) : (
          <div>
            {signer.valid === null && <p>{l10n.map.digital_signature_status_null_description}</p>}
            <p className="mb-0"><b>{l10n.map.keygrid_keyid}:</b> {signer.keyId.toUpperCase()}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

SignatureModal.propTypes = {
  isOpen: PropTypes.bool,
  signer: PropTypes.object,
  onHide: PropTypes.func,
  toggle: PropTypes.func
};
