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
  'dialog_no_button',
  'keybackup_setup_dialog_button',
  'key_gen_success'
]);

/**
 * @param {KeyDetailsProps} props
 */
function KeyDetails({type, name, email, keyId}) {
  if (!type || !name || !email || !keyId) {
    return <></>;
  }
  return (
    <>
      <p className="mb-1 font-weight-bold">{l10n.map.alert_header_success}</p>
      <p className="mb-1">{l10n.map.key_gen_success}:</p>
      <Alert type="info" className="mb-3 flex-shrink-1">
        <span className={`icon icon-${type === 'public' ? 'key' : 'key-pair'} mr-1`} style={{fontSize: '1.25rem'}}></span>
        <span style={{fontSize: '1rem', fontWeight: 500}}>{name}</span>{`<${email}>`}<br />
        {`#${keyId}`}
      </Alert>
    </>
  );
}

/**
 * @param {{
 *  isOpen: boolean,
 *  keyId: string,
 *  keyFpr: string,
 *  keyringId: string,
 *  onClose: () => void
 * }} props
 */
function KeyBackup({isOpen, keyId, keyFpr, keyringId, onClose}) {
  const fileURLRef = useRef('');
  const exportLinkRef = useRef(null);
  /** @type {[KeyDetailsProps, React.Dispatch<React.SetStateAction<KeyDetailsProps>>]} */
  const [keyDetails, setKeyDetails] = React.useState(null);
  const [keyExported, setKeyExported] = React.useState(false);

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

          const keyDetails = await port.send('getKeyDetails', {
            keyringId,
            fingerprint: keyFpr,
          });
          setKeyDetails({
            type: 'key-pair',
            name: keyDetails.users[0].name,
            email: keyDetails.users[0].email,
            keyId,
          });

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
  }, [isOpen, keyId, keyFpr, keyringId, fileName]);

  return (
    <Modal
      isOpen={isOpen}
      onClosed={onClose}
      toggle={onClose}
    >
      <ModalHeader toggle={onClose}>
        {l10n.map.keybackup_restore_dialog_headline}
      </ModalHeader>
      <ModalBody>
        {keyDetails && <KeyDetails type={keyDetails.type} name={keyDetails.name} email={keyDetails.email} keyId={keyDetails.keyId} />}
        <p>
          A private key backup is essential for recovering your encrypted data in case of data loss or even reinstallation of your operating system, browser or this web extension.
        </p>
        <Alert type="warning" header={l10n.map.alert_header_important}>
          Store it securely in a safe location, for example, on a USB drive or in a password manager.
        </Alert>
      </ModalBody>
      <ModalFooter>
        <div className="btn-bar justify-content-between">
          <Button onClick={onClose}>
            {keyExported ? l10n.map.dialog_popup_close : l10n.map.dialog_no_button}
          </Button>
          <a
            className="button btn btn-primary"
            download={fileName}
            href={fileURLRef.current}
            ref={exportLinkRef}
            role="button"
            onClick={() => {
              setKeyExported(true);
            }}
          >{l10n.map.keybackup_setup_dialog_button}</a>
        </div>
      </ModalFooter>
    </Modal>
  );
}

KeyBackup.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  keyId: PropTypes.string.isRequired,
  keyFpr: PropTypes.string.isRequired,
  keyringId: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

/**
 * @typedef {Object} KeyDetailsProps
 * @property {'public' | 'key-pair'} type
 * @property {string} name
 * @property {string} email
 * @property {string} keyId
 */
KeyDetails.propTypes = {
  type: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  keyId: PropTypes.string.isRequired,
};

export default KeyBackup;
