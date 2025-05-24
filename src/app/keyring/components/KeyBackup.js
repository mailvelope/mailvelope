import PropTypes from 'prop-types';
import React, {useEffect, useRef} from 'react';
import {Button, Modal, ModalBody, ModalFooter, ModalHeader} from 'reactstrap';
import Alert from '../../../components/util/Alert';
import {port} from '../../app';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'key_export_warning_private',
  'key_backup_title',
  'keybackup_restore_dialog_headline',
  'alert_header_warning',
  'key_export_create_file',
  'dialog_popup_close',
  'keybackup_setup_dialog_button',
  'key_gen_success'
]);

const KeyBackup = ({isOpen, keyFpr, keyringId, onClose}) => {
  const fileURLRef = useRef('');
  const exportLinkRef = useRef(null);

  const fileName = `${keyFpr}-backup.asc`;

  useEffect(() => {
    if (isOpen && keyFpr && keyringId) {
      const fetchKey = async () => {
        try {
          const [key] = await port.send('getArmoredKeys', {
            keyringId,
            keyFprs: keyFpr,
            options: {pub: true, priv: true, all: false},
          });
          if (!key || !key.armoredPrivate || !key.armoredPublic) {
            throw new Error('Key not found or invalid');
          }
          const armoredExport = `${key.armoredPrivate}\n${key.armoredPublic}`;

          const file = new File(
            [armoredExport],
            fileName,
            {type: 'application/pgp-keys'}
          );
          fileURLRef.current = window.URL.createObjectURL(file);
        } catch (error) {
          console.error('Failed to fetch armored keys:', error);
        }
      };
      fetchKey();
    }

    return () => {
      if (fileURLRef.current) {
        window.URL.revokeObjectURL(fileURLRef.current);
        fileURLRef.current = '';
      }
    };
  }, [isOpen, keyFpr, keyringId, fileName]);

  return (
    <Modal
      isOpen={isOpen}
      onClosed={onClose}
      toggle={onClose}
    >
      <ModalHeader toggle={onClose}>
        {l10n.map.keybackup_restore_dialog_headline || 'Create a backup'}
      </ModalHeader>
      <ModalBody>
        <p>
          {l10n.map.key_gen_success}
        </p>
        <p>
          A private key backup is essential for recovering your encrypted data in case of data loss or even reinstallation of your operating system, browser or this web extension.
        </p>
        <p>
          Store it securely in a safe location, for example, on a USB drive or in a password manager.
        </p>
        <Alert type="warning" header={l10n.map.alert_header_warning}>
          {l10n.map.key_export_warning_private}
        </Alert>
      </ModalBody>
      <ModalFooter>
        <div className="btn-bar justify-content-between">
          <Button onClick={onClose}>
            {l10n.map.dialog_popup_close}
          </Button>
          <a
            className="button btn btn-primary"
            download={fileName}
            href={fileURLRef.current}
            ref={exportLinkRef}
            role="button"
          >{l10n.map.keybackup_setup_dialog_button}</a>
        </div>
      </ModalFooter>
    </Modal>
  );
};

KeyBackup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  keyFpr: PropTypes.string.isRequired,
  keyringId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

export default KeyBackup;
