/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import dompurify from 'dompurify';
// import * as openpgp from 'openpgp';
import * as keyring from '../modules/keyring';
import mvelo from "../mvelo";

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = mvelo.LOCAL_KEYRING_ID;
    this.formAction = null;
    this.formRecipient = null;
    this.formSignature = null;

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
    this.ports.encryptedFormCont.emit('error-message', {error: error.message});
  }

  onFormResize(event) {
    this.ports.encryptedFormCont.emit('encrypted-form-resize', {height: event.height});
  }

  onFormDefinition(event) {
    // Cleanup to get only the form tag
    const formTag = this.getCleanFormTag(event.html);

    // Extract action, recipient, encoding, etc.
    try {
      this.checkOnlyOneForm(formTag);
      this.parseAction(formTag);
      this.parseRecipient(formTag);
      this.parseEncoding(formTag);
      this.checkFingerprint();
    } catch (error) {
      this.onFormError(error);
    }

    // Give form definition to react component
    const cleanHtml = this.getCleanFormHtml(event.html);
    this.ports.encryptedForm.emit('encrypted-form-definition', {
      formDefinition: cleanHtml,
      formEncoding: this.formEncoding,
      formAction: this.formAction,
      formRecipient: this.formRecipient,
      formFingerprint: this.formFingerprint,
    });
  }

  onFormSubmit(event) {
    // todo encrypt data
    const armoredData = event.data;
    if (this.formAction === null) {
      this.ports.encryptedFormCont.emit('encrypted-form-data', {armoredData});
    } else {
      this.ports.encryptedForm.emit('encrypted-form-submit', {armoredData});
    }
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

  parseAction(formTag) {
    const dataUrlRegex = /data-action=[\"'](.*?)[\"']/gi;
    const match = dataUrlRegex.exec(formTag);
    if (match === null) {
      // empty data-action is allowed in form definition
      // in this case the encrypted content will be returned to the page
      this.formAction = null;
      return true;
    }
    if (!mvelo.util.checkUrl(match[1])) {
      throw new Error('The form action should be a valid url.');
    }
    this.formAction = match[1];
    return true;
  }

  parseRecipient(formTag) {
    const dataRecipientRegex = /data-recipient=[\"'](.*?)[\"']/gi;
    const match = dataRecipientRegex.exec(formTag);
    if (match === null) {
      throw new Error('The encrypted form recipient cannot be empty.');
    }
    if (!mvelo.util.checkEmail(match[1])) {
      throw new Error('The encrypted form recipient must be a valid email address.');
    }
    this.formRecipient = match[1];
    return true;
  }

  parseEncoding(formTag) {
    const dataEnctypeRegex = /data-enctype=[\"'](.*?)[\"']/gi;
    const match = dataEnctypeRegex.exec(formTag);
    let enctype = 'url';
    if (match !== null) {
      enctype = match[1]; // fallback if enctype is not defined
    }
    const whitelistedEnctype = ['json', 'url', 'html'];
    if (whitelistedEnctype.indexOf(enctype) === -1) {
      throw new Error('The requested encrypted form encoding type if is not supported.');
    }
    this.formEncoding = enctype;
    return true;
  }

  checkFingerprint() {
    const keyMap = keyring.getById(mvelo.LOCAL_KEYRING_ID).getKeyByAddress([this.formRecipient]);
    if (typeof keyMap[this.formRecipient] !== 'undefined' && keyMap[this.formRecipient].length) {
      this.formFingerprint = keyMap[this.formRecipient][0].primaryKey.getFingerprint().toUpperCase();
    } else {
      throw new Error('The recipient key could not be found in the keyring.');
    }
  }

  checkOnlyOneForm(html) {
    const formOccur= ((html.match(/<form/g) || []).length);
    if (formOccur !== 1) {
      throw new Error('There should be only one form tag in the form definition.');
    }
    return true;
  }
}
