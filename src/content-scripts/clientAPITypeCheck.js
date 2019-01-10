/**
 * Copyright (C) 2014-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {MvError} from '../lib/util';

const dataTypes = {
  identifier: 'string',
  event: 'string',
  _reply: 'string',
  selector: 'string',
  armored: 'string',
  options: 'object',
  recipients: 'array',
  emailAddr: 'string',
  dataURL: 'string',
  revision: 'number',
  fingerprint: 'string',
  syncHandlerObj: 'object',
  editorId: 'string',
  generatorId: 'string',
  popupId: 'string',
  syncHandlerId: 'string',
  syncType: 'string',
  syncData: 'object',
  error: 'object',
  restoreId: 'string',
  restoreBackup: 'string',
  id: 'string',
  confirmRequired: 'boolean',
  signature: 'string',
  formHtml: 'string',
  date: 'string',
  fromAddr: 'string',
  header: 'string',
  source: 'string'
};

const optionsTypes = {
  showExternalContent: 'boolean',
  quota: 'number',
  predefinedText: 'string',
  quotedMail: 'string',
  signMsg: 'boolean',
  quotedMailIndent: 'boolean',
  quotedMailHeader: 'string',
  userIds: 'array',
  keySize: 'number',
  initialSetup: 'boolean',
  senderAddress: 'string',
  restorePassword: 'boolean',
  email: 'string',
  fullName: 'string',
  keepAttachments: 'boolean',
  armoredDraft: 'string'
};

export function checkTypes(data) {
  enforceTypeWhitelist(data, dataTypes);
  if (data.options && typeof data.options === 'object') {
    enforceTypeWhitelist(data.options, optionsTypes);
  }
}

function enforceTypeWhitelist(data, whitelist) {
  const parameters = Object.keys(data) || [];
  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    const dataType = whitelist[parameter];
    const value = data[parameter];
    if (dataType === undefined) {
      console.log(`Mailvelope client-API type checker: parameter ${parameter} not accepted.`);
      delete data[parameter];
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    let wrong = false;
    switch (dataType) {
      case 'array':
        if (!Array.isArray(value)) {
          wrong = true;
        }
        break;
      default:
        if (typeof value !== dataType) {
          wrong = true;
        }
    }
    if (wrong) {
      throw new MvError(`Type mismatch: ${parameter} should be of type ${dataType}.`, 'TYPE_MISMATCH');
    }
  }
}
