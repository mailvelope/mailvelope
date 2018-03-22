/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';
import dompurify from 'dompurify';
// import * as openpgp from 'openpgp';
// import * as keyring from '../modules/keyring';
import mvelo from "../lib/lib-mvelo";

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.keyringId = mvelo.LOCAL_KEYRING_ID;
    this.formAction = null;
    this.formRecipient = null;
    this.formSignature = null;

    this.on('encrypted-form-init', this.onFormInit);
    this.on('encrypted-form-definition', this.onFormDefinition);
    this.on('encrypted-form-submit', this.onFormSubmit);
  }

  onFormInit() {
    this.ports.encryptedFormCont.emit('encrypted-form-ready');
  }

  onFormDefinition(event) {
    // Cleanup to get only the form tag
    const formTag = this.getCleanFormTag(event.html);

    // Check if form tag is not empty
    // Check that there is only one form tag

    // Extract form destination url and recipient
    if (!this.parseAction(formTag)) {
      // empty data-action is allowed
      // in this case the encrypted content will be returned to the page
    }
    if (!this.parseRecipient(formTag)) {
      this.ports.encryptedFormCont.emit('error-message', {error: 'The form recipient cannot be empty.'});
    }

    // Check if signature is valid
    // TODO move to a method in openpgp model
    // try {
    //   let recipientKey = keyring.getById(mvelo.LOCAL_KEYRING_ID).getKeyByAddress([this.formRecipient]);
    //   openpgp.verify({message: 'biloute', publicKeys: recipientKey, signature: this.formSignature});
    //
    // } catch (error) {
    //   console.log(error.message);
    // }

    // Give form definition to react component
    const cleanHtml = this.getCleanFormHtml(event.html);
    this.ports.encryptedForm.emit('encrypted-form-definition', {
      formDefinition: cleanHtml,
      formAction: this.formAction,
      formRecipient: this.formRecipient
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
    if (match !== null) {
      this.formAction = match[1];
      return false;
    }
    return true;
  }

  parseRecipient(formTag) {
    const dataRecipientRegex = /data-recipient=[\"'](.*?)[\"']/gi;
    const match = dataRecipientRegex.exec(formTag);
    if (match === null) {
      return false;
    }
    this.formRecipient = match[1];
    return true;
  }
}
