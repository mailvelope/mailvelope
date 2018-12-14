/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import * as l10n from '../lib/l10n';
import {mapError, checkEmail, checkUrl, MvError} from '../lib/util';
import {getById as getKeyringById, getPreferredKeyringId} from '../modules/keyring';
import {verifyDetachedSignature, encryptMessage} from '../modules/pgpModel';
import * as keyRegistry from '../modules/keyRegistry';
import dompurify from 'dompurify';

// get language strings
l10n.set([
  'form_definition_error_signature_invalid',
  'form_sign_error_no_default_key'
]);

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = getPreferredKeyringId();
    this.formAction = null;
    this.formRecipientEmail = null;
    this.formSignature = null;
    this.recipientFpr = null;
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
        this.ports.encryptedFormCont.emit('error-message', mapError(error));
        break;

      // Errors that should not be exposed to the API, only displayed in the form UI
      case 'NO_KEY_FOR_RECIPIENT':
      case 'INVALID_SIGNATURE':
      case 'NO_DEFAULT_KEY_FOUND':
      default:
        this.ports.encryptedForm.emit('error-message', mapError(error));
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
    } catch (error) {
      this.onFormError(error);
      return;
    }

    try {
      await this.validateSignature(event.html);
    } catch (error) {
      this.onFormError(error);
      return;
    }

    const cleanHtml = this.getCleanFormHtml(event.html);
    this.ports.encryptedForm.emit('encrypted-form-definition', {
      formDefinition: cleanHtml,
      formEncoding: this.formEncoding,
      formAction: this.formAction,
      formRecipient: this.formRecipientEmail,
      recipientFpr: this.recipientFpr
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
      throw new MvError('There should be one form tag in the form definition.', 'NO_FORM');
    }
    if (formElementCollection.length > 1) {
      throw new MvError('There should be only one form tag in the form definition.', 'TOO_MANY_FORMS');
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
    if (!checkUrl(action)) {
      throw new MvError('The form action should be a valid URL.', 'INVALID_FORM_ACTION');
    }
    this.formAction = action;
    return true;
  }

  assertAndSetRecipient(formElement) {
    const recipient = formElement.getAttribute('data-recipient');
    if (!recipient) {
      throw new MvError('The encrypted form recipient cannot be empty.', 'RECIPIENT_EMPTY');
    }
    if (!checkEmail(recipient)) {
      throw new MvError('The encrypted form recipient must be a valid email address.', 'RECIPIENT_INVALID_EMAIL');
    }
    this.formRecipientEmail = recipient;
    return true;
  }

  assertAndSetEncoding(formElement) {
    let enctype = formElement.getAttribute('data-enctype');
    if (!enctype) {
      enctype = 'url';
    }
    const whitelistedEnctype = ['json', 'url', 'html'];
    if (whitelistedEnctype.indexOf(enctype) === -1) {
      throw new MvError('The requested encrypted form encoding type is not supported.', 'UNSUPPORTED_ENCTYPE');
    }
    this.formEncoding = enctype;
    this.fileExtension = enctype;
    if (enctype === 'url') {
      this.fileExtension = 'txt';
    }
    return true;
  }

  assertAndSetSignature(signature) {
    if (!signature) {
      throw new MvError('Form definition does not contain a signature.', 'NO_SIGNATURE');
    }
    this.formSignature = signature;
    return true;
  }

  async validateSignature(rawHtml) {
    const detachedSignature =
`-----BEGIN PGP SIGNATURE-----
Comment: openpgp-encrypted-form

${this.formSignature}
-----END PGP SIGNATURE-----`;

    const {signatures} = await verifyDetachedSignature({plaintext: rawHtml, signerEmail: this.formRecipientEmail, detachedSignature, keyringId: this.keyringId, autoLocate: this.autoLocate.bind(this)});
    const validSig = signatures.find(sig => sig.valid === true);
    if (validSig) {
      this.recipientFpr = validSig.fingerprint;
      return true;
    } else {
      throw new MvError(l10n.map.form_definition_error_signature_invalid, 'INVALID_SIGNATURE');
    }
  }

  async autoLocate() {
    const armored = await keyRegistry.lookup(this.formRecipientEmail, this.keyringId);
    if (armored) {
      try {
        await sub.factory.get('importKeyDialog').importKey(this.keyringId, armored);
      } catch (e) {
        console.log('Key import after auto locate failed', e);
      }
    }
  }

  async signAndEncrypt(data) {
    const defaultKeyFpr = await getKeyringById(this.keyringId).getDefaultKeyFpr();
    if (!defaultKeyFpr) {
      throw new MvError(l10n.map.form_sign_error_no_default_key, 'NO_DEFAULT_KEY_FOUND');
    }
    return encryptMessage({
      data,
      keyringId: this.keyringId,
      unlockKey: this.unlockKey,
      encryptionKeyFprs: [this.recipientFpr],
      signingKeyFpr: defaultKeyFpr,
      uiLogSource: 'security_log_encrypt_form',
      filename: `opengp-encrypted-form-data.${this.fileExtension}`
    });
  }

  async unlockKey({key}) {
    const pwdControl = sub.factory.get('pwdDialog');
    const {key: unlocked} = await pwdControl.unlockKey({key, reason: 'PWD_DIALOG_REASON_SIGN'});
    return unlocked;
  }
}
