/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import dompurify from 'dompurify';
import * as keyring from '../modules/keyring';
import mvelo from "../mvelo";
import {getById as getKeyringById} from "../modules/keyring";
import * as model from "../modules/pgpModel";

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = mvelo.LOCAL_KEYRING_ID;
    this.formAction = null;
    this.formRecipient = null;
    this.formSignature = null;
    this.recipientKey = null;
    this.pwdControl = null;

    this.on('encrypted-form-init', this.onFormInit);
    this.on('encrypted-form-definition', this.onFormDefinition);
    this.on('encrypted-form-error', this.onFormError);
    this.on('encrypted-form-submit', this.onFormSubmit);
    this.on('encrypted-form-resize', this.onFormResize);
  }

  onFormInit() {
    this.ports.encryptedFormCont.emit('encrypted-form-ready');
  }

  onFormError(error) {
    // TODO decide which error to send to iframe / which one to send to app
    this.ports.encryptedFormCont.emit('error-message', {error: error.message});
  }

  onFormResize(event) {
    this.ports.encryptedFormCont.emit('encrypted-form-resize', {height: event.height});
  }

  onFormDefinition(event) {
    const formTag = this.getCleanFormTag(event.html);

    try {
      this.assertAndSetSignature(event);
      this.assertOnlyOneForm(formTag);
      this.assertAndSetAction(formTag);
      this.assertAndSetEncoding(formTag);
      this.assertAndSetRecipient(formTag);
      this.assertAndSetFingerprint();
    } catch (error) {
      this.onFormError(error);
    }

    this.validateSignature(event.html)
    .then(() => {
      const cleanHtml = this.getCleanFormHtml(event.html);
      this.ports.encryptedForm.emit('encrypted-form-definition', {
        formDefinition: cleanHtml,
        formEncoding: this.formEncoding,
        formAction: this.formAction,
        formRecipient: this.formRecipient,
        formFingerprint: this.formFingerprint,
      });
    })
    .catch(error => {
      this.onFormError(error);
    });
  }

  onFormSubmit(event) {
    if (this.pwdControl !== null) {
      // dialog is already open and waiting for pinentry
      this.pwdControl.onCancel();
    }

    this.signAndEncrypt(event.data)
    .then(armoredData => {
      if (this.formAction === null) {
        this.ports.encryptedFormCont.emit('encrypted-form-data', {armoredData});
      } else {
        this.ports.encryptedForm.emit('encrypted-form-submit', {armoredData});
      }
    })
    .catch(error => {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        return;
      }
      this.onFormError(error);
    });
  }

  getCleanFormHtml(dirtyHtml) {
    return dompurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        'bdi', 'bdo', 'br', 'datalist', 'div', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'input',
        'label', 'legend', 'optgroup', 'option', 'p', 'select', 'small', 'span', 'strong', 'textarea'
      ],
      ALLOWED_ATTR: [
        // default html attributes
        'accesskey', 'class', 'dir', 'hidden', 'id', 'lang', 'tabindex', 'title', 'action', 'name', 'alt',
        'checked', 'dirname', 'disabled', 'for', 'required', 'list', 'max', 'maxlength', 'min', 'multiple',
        'name', 'pattern', 'placeholder', 'readonly', 'required', 'size', 'step', 'type', 'value',
        // custom data attributes
        'data-action', 'data-recipient'
      ],
      SAFE_FOR_TEMPLATES: false,
      SAFE_FOR_JQUERY: false
    });
  }

  getCleanFormTag(dirtyHtml) {
    return dompurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: ['form'],
      ALLOWED_ATTR: ['data-action', 'data-recipient']
    });
  }

  assertAndSetAction(formTag) {
    const dataUrlRegex = /data-action=[\"'](.*?)[\"']/gi;
    const match = dataUrlRegex.exec(formTag);
    if (match === null) {
      // empty data-action is allowed in form definition
      // in this case the encrypted content will be returned to the page
      this.formAction = null;
      return true;
    }
    if (!mvelo.util.checkUrl(match[1])) {
      throw new mvelo.Error('The form action should be a valid url.', 'INVALID_FORM_ACTION');
    }
    this.formAction = match[1];
    return true;
  }

  assertAndSetRecipient(formTag) {
    const dataRecipientRegex = /data-recipient=[\"'](.*?)[\"']/gi;
    const match = dataRecipientRegex.exec(formTag);
    if (match === null) {
      throw new mvelo.Error('The encrypted form recipient cannot be empty.', 'RECIPIENT_EMPTY');
    }
    if (!mvelo.util.checkEmail(match[1])) {
      throw new mvelo.Error('The encrypted form recipient must be a valid email address.', 'RECIPIENT_INVALID_EMAIL');
    }
    this.formRecipient = match[1];
    return true;
  }

  assertAndSetEncoding(formTag) {
    const dataEnctypeRegex = /data-enctype=[\"'](.*?)[\"']/gi;
    const match = dataEnctypeRegex.exec(formTag);
    let enctype = 'url'; // fallback if enctype is not defined
    if (match !== null) {
      enctype = match[1];
    }
    const whitelistedEnctype = ['json', 'url', 'html'];
    if (whitelistedEnctype.indexOf(enctype) === -1) {
      throw new mvelo.Error('The requested encrypted form encoding type if is not supported.', 'UNSUPORTED_ENCTYPE');
    }
    this.formEncoding = enctype;
    return true;
  }

  assertAndSetFingerprint() {
    const keyMap = keyring.getById(this.keyringId).getKeyByAddress([this.formRecipient]);
    if (typeof keyMap[this.formRecipient] !== 'undefined' && keyMap[this.formRecipient].length) {
      this.recipientKey = keyMap[this.formRecipient][0];
      this.formFingerprint = this.recipientKey.primaryKey.getFingerprint().toUpperCase();
    } else {
      throw new mvelo.Error('No valid encryption key for recipient address', 'NO_ENCRYPTION_KEY_FOUND');
    }
  }

  assertAndSetSignature(event) {
    // todo baseline signature validation
    if (typeof event.signature === 'undefined') {
      throw new mvelo.Error('No valid signature.', 'NO_SIGNATURE');
    }
    this.formSignature = event.signature;
  }

  assertOnlyOneForm(html) {
    const formOccur = ((html.match(/<form/g) || []).length);
    if (formOccur !== 1) {
      throw new mvelo.Error('There should be only one form tag in the form definition.', 'TOO_MANY_FORMS');
    }
    return true;
  }

  validateSignature(rawHtml) {
    const signature = `-----BEGIN PGP SIGNATURE-----
Comment: pgp-encrypted-form

${this.formSignature}
-----END PGP SIGNATURE-----`;

    return model.verifyDetachedSignature(rawHtml, [this.recipientKey], signature).then(verified => {
      if (verified.signatures[0].valid === true) {
        return true;
      } else {
        throw new mvelo.Error('The form signature is not valid.', 'INVALID_SIGNATURE');
      }
    });
  }

  signAndEncrypt(data) {
    let signKey;
    return Promise.resolve()
    .then(() => {
      this.encryptTimer = null;
      signKey = getKeyringById(this.keyringId).getPrimaryKey();
      if (!signKey) {
        throw new mvelo.Error('No primary key found', 'NO_PRIMARY_KEY_FOUND');
      }

      const signKeyPacket = signKey.key.getSigningKeyPacket();
      const signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
      if (!signKeyid) {
        throw new mvelo.Error('No valid signing key packet found', 'NO_SIGN_KEY_FOUND');
      }

      signKey.keyid = signKeyid;
      signKey.keyringId = this.keyringId;
      signKey.reason = 'PWD_DIALOG_REASON_SIGN';
      signKey.noCache = false;
    })
    .then(() => {
      this.pwdControl = sub.factory.get('pwdDialog');
      return this.pwdControl.unlockKey(signKey);
    })
    .then(() => {
      this.pwdControl = null;
      return model.encryptMessage({
        keyIdsHex: [this.recipientKey.primaryKey.getFingerprint()],
        keyringId: this.keyringId,
        primaryKey: signKey,
        message: data,
        uiLogSource: 'security_log_editor'
      });
    });
  }
}
