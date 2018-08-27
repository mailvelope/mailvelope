/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import dompurify from 'dompurify';
import * as keyring from '../modules/keyring';
import mvelo from "../mvelo";
import {getById as getKeyringById} from "../modules/keyring";
import {verifyDetachedSignature, encryptMessage} from "../modules/pgpModel";

// register language strings
const l10n = mvelo.l10n.getMessages([
  'form_definition_error_no_recipient_key',
  'form_definition_error_signature_invalid',
  'form_sign_error_no_primary_key',
  'form_sign_error_no_sign_key'
]);

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = mvelo.LOCAL_KEYRING_ID;
    this.formAction = null;
    this.formRecipient = null;
    this.formSignature = null;
    this.recipientKey = null;
    this.fileExtension = null;

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
    switch (error.code) {
      // Errors that are exposed to the API
      case 'NO_FORM':
      case 'TOO_MANY_FORMS':
      case 'NO_FORM_INPUT':
      case 'INVALID_FORM_ACTION':
      case 'RECIPIENT_EMPTY':
      case 'RECIPIENT_INVALID_EMAIL':
      case 'UNSUPPORTED_ENCTYPE':
      case 'NO_SIGNATURE':
        this.ports.encryptedFormCont.emit('error-message', mvelo.util.mapError(error));
        break;

      // Errors that should not be exposed to the API, only displayed in the form UI
      case 'NO_KEY_FOR_RECIPIENT':
      case 'INVALID_SIGNATURE':
      case 'NO_PRIMARY_KEY_FOUND':
      case 'NO_SIGN_KEY_FOUND':
      default:
        this.ports.encryptedForm.emit('error-message', mvelo.util.mapError(error));
        break;
    }
  }

  onFormResize(event) {
    this.ports.encryptedFormCont.emit('encrypted-form-resize', {height: event.height});
  }

  async onFormDefinition(event) {
    try {
      const form = this.getCleanFormElement(event.html);
      this.assertAndSetSignature(event.signature);
      this.assertAndSetAction(form);
      this.assertAndSetEncoding(form);
      this.assertAndSetRecipient(form);
      this.assertAndSetFingerprint();
    } catch (error) {
      this.onFormError(error);
      return;
    }

    try {
      await this.validateSignature(event.html);
    } catch (error) {
      this.onFormError(error);
    }

    const cleanHtml = this.getCleanFormHtml(event.html);
    this.ports.encryptedForm.emit('encrypted-form-definition', {
      formDefinition: cleanHtml,
      formEncoding: this.formEncoding,
      formAction: this.formAction,
      formRecipient: this.formRecipient,
      formFingerprint: this.formFingerprint
    });
  }

  async onFormSubmit(event) {
    try {
      const armoredData = await this.signAndEncrypt(event.data);
      if (!this.formAction) {
        this.ports.encryptedFormCont.emit('encrypted-form-data', {armoredData});
      } else {
        this.ports.encryptedForm.emit('encrypted-form-submit', {armoredData});
      }
    } catch (error) {
      if (error.code === 'PWD_DIALOG_CANCEL') {
        this.ports.encryptedForm.emit('encrypted-form-submit-cancel');
        return;
      }
      this.onFormError(error);
    }
  }

  getCleanFormHtml(dirtyHtml) {
    return dompurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        'bdi', 'bdo', 'br', 'datalist', 'div', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'img',
        'input', 'label', 'legend', 'optgroup', 'option', 'p', 'select', 'small', 'span', 'strong', 'textarea'
      ],
      ALLOWED_ATTR: [
        // default html attributes
        'accesskey', 'class', 'dir', 'hidden', 'id', 'lang', 'tabindex', 'title', 'action', 'name', 'alt',
        'checked', 'dirname', 'disabled', 'for', 'required', 'list', 'max', 'maxlength', 'min', 'multiple',
        'name', 'pattern', 'placeholder', 'readonly', 'required', 'src', 'size', 'step', 'type', 'value',
        // custom data attributes
        'data-action', 'data-recipient'
      ],
      SAFE_FOR_TEMPLATES: false,
      SAFE_FOR_JQUERY: false,
      ALLOW_DATA_ATTR: false
    });
  }

  getCleanFormElement(dirtyHtml) {
    const html = dompurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: ['form'],
      ALLOWED_ATTR: ['data-action', 'data-recipient', 'data-enctype'],
      ALLOW_DATA_ATTR: false
    });
    const parser = new DOMParser();
    const formElementCollection = parser.parseFromString(html, 'text/html').getElementsByTagName('form');
    if (!formElementCollection.length) {
      throw new mvelo.Error('There should be one form tag in the form definition.', 'NO_FORM');
    }
    if (formElementCollection.length > 1) {
      throw new mvelo.Error('There should be only one form tag in the form definition.', 'TOO_MANY_FORMS');
    }
    return formElementCollection[0];
  }

  assertAndSetAction(formElement) {
    const action = formElement.getAttribute('data-action');
    if (!action) {
      // empty data-action is allowed in form definition
      // in this case the encrypted content will be returned to the page
      this.formAction = null;
      return true;
    }
    if (!mvelo.util.checkUrl(action)) {
      throw new mvelo.Error('The form action should be a valid URL.', 'INVALID_FORM_ACTION');
    }
    if (!action.startsWith('https:')) {
      throw new mvelo.Error('The form action URL is not secure.', 'INVALID_FORM_ACTION');
    }
    this.formAction = action;
    return true;
  }

  assertAndSetRecipient(formElement) {
    const recipient = formElement.getAttribute('data-recipient');
    if (!recipient) {
      throw new mvelo.Error('The encrypted form recipient cannot be empty.', 'RECIPIENT_EMPTY');
    }
    if (!mvelo.util.checkEmail(recipient)) {
      throw new mvelo.Error('The encrypted form recipient must be a valid email address.', 'RECIPIENT_INVALID_EMAIL');
    }
    this.formRecipient = recipient;
    return true;
  }

  assertAndSetEncoding(formElement) {
    let enctype = formElement.getAttribute('data-enctype');
    if (!enctype) {
      enctype = 'url';
    }
    const whitelistedEnctype = ['json', 'url', 'html'];
    if (whitelistedEnctype.indexOf(enctype) === -1) {
      throw new mvelo.Error('The requested encrypted form encoding type is not supported.', 'UNSUPPORTED_ENCTYPE');
    }
    this.formEncoding = enctype;
    this.fileExtension = enctype;
    if (enctype === 'url') {
      this.fileExtension = 'txt';
    }
    return true;
  }

  assertAndSetFingerprint() {
    const keyMap = keyring.getById(this.keyringId).getKeyByAddress([this.formRecipient]);
    if (keyMap[this.formRecipient] && keyMap[this.formRecipient].length) {
      this.recipientKey = keyMap[this.formRecipient][0];
      this.formFingerprint = this.recipientKey.primaryKey.getFingerprint().toUpperCase();
    } else {
      throw new mvelo.Error(l10n.form_definition_error_no_recipient_key, 'NO_KEY_FOR_RECIPIENT');
    }
    return true;
  }

  assertAndSetSignature(signature) {
    if (!signature) {
      throw new mvelo.Error('Form definition does not contain valid signature.', 'NO_SIGNATURE');
    }
    this.formSignature = signature;
    return true;
  }

  validateSignature(rawHtml) {
    const signature =
`-----BEGIN PGP SIGNATURE-----
Comment: openpgp-encrypted-form

${this.formSignature}
-----END PGP SIGNATURE-----`;

    return verifyDetachedSignature(rawHtml, [this.recipientKey], signature).then(verified => {
      if (verified.signatures[0].valid === true) {
        return true;
      } else {
        throw new mvelo.Error(l10n.form_definition_error_signature_invalid, 'INVALID_SIGNATURE');
      }
    });
  }

  async signAndEncrypt(data) {
    const signKey = getKeyringById(this.keyringId).getPrimaryKey();
    if (!signKey) {
      throw new mvelo.Error(l10n.form_sign_error_no_primary_key, 'NO_PRIMARY_KEY_FOUND');
    }
    const signKeyPacket = signKey.key.getSigningKeyPacket();
    const signKeyid = signKeyPacket && signKeyPacket.getKeyId().toHex();
    if (!signKeyid) {
      throw new mvelo.Error(l10n.form_sign_error_no_sign_key, 'NO_SIGN_KEY_FOUND');
    }
    signKey.keyid = signKeyid;
    signKey.keyringId = this.keyringId;
    signKey.reason = 'PWD_DIALOG_REASON_SIGN';
    signKey.noCache = false;
    await sub.factory.get('pwdDialog').unlockKey(signKey);
    return encryptMessage({
      keyIdsHex: [this.recipientKey.primaryKey.getFingerprint()],
      keyringId: this.keyringId,
      primaryKey: signKey,
      message: data,
      uiLogSource: 'security_log_encrypt_form',
      filename: `opengp-encrypted-form-data.${this.fileExtension}`
    });
  }
}
