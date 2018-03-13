/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as sub from './sub.controller';

export default class EncryptedFormController extends sub.SubController {
  constructor(port) {
    super(port);
    this.on('encrypted-form-init', this._onFormInit);
    this.on('encrypted-form-definition', this._onFormDefinition);
  }

  _onFormInit() {
    this.ports.encryptedFormCont.emit('encrypted-form-ready');
  }

  _onFormDefinition(event) {
    const html = event.html;
    const signature = event.signature;
    this.ports.encryptedForm.emit('encrypted-form-definition-ok', {signature, html});
  }
}
