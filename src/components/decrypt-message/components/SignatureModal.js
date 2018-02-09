/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import ModalDialog from '../../util/ModalDialog';

import './SignatureModal.css';

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

export default function SignatureModal({signer, onHide}) {
  let status;
  let bgClass;
  if (signer.valid === true) {
    bgClass = 'bg-success';
    status = l10n.map.digital_signature_status_true;
  } else if (signer.valid === false) {
    bgClass = 'bg-danger';
    status = l10n.map.digital_signature_status_false;
  } else if (signer.valid === null) {
    bgClass = 'bg-warning';
    status = l10n.map.digital_signature_status_null;
  }
  return (
    <ModalDialog onHide={onHide} headerClass={bgClass}
      header={
        <div>
          <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 className="modal-title"><b>{l10n.map.keygrid_validity_status}:</b> {status}</h4>
        </div>
      }
      footer={
        <button type="button" className="btn btn-default" data-dismiss="modal">{l10n.map.dialog_popup_close}</button>
      }
    >
      <div>
        {signer.valid !== null ? (
          <div>
            <p><b>{l10n.map.keygrid_user_name}:</b> {signer.keyDetails.name}</p>
            <p><b>{l10n.map.keygrid_user_email}:</b> {signer.keyDetails.email}</p>
            <p><b>{l10n.map.keygrid_key_fingerprint}:</b> {signer.keyDetails.fingerprint.match(/.{1,4}/g).join(' ')}</p>
          </div>
        ) : (
          <div>
            {signer.valid === null && <p>{l10n.map.digital_signature_status_null_description}</p>}
            <p><b>{l10n.map.keygrid_keyid}:</b> {signer.keyid.toUpperCase()}</p>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}

SignatureModal.propTypes = {
  signer: PropTypes.object,
  onHide: PropTypes.func
};
