/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {localizeHTML} from '../../lib/l10n.js';
import {showSecurityBackground} from '../../lib/util.js';
import EventHandler from '../../lib/EventHandler.js';

// communication to background page
let port;

function init() {
  const qs = jQuery.parseQuerystring();
  port = EventHandler.connect(`backupCodeWindow-${qs.id}`);
  registerEventListeners();
  const formattedDate = new Date();
  $('#currentDate').html(formattedDate.toLocaleDateString());
  localizeHTML();
  setBrand(qs.brand);
  showSecurityBackground(port, qs.embedded);
  port.emit('get-logo-image');
  port.emit('get-backup-code');
}

function registerEventListeners() {
  port.on('set-backup-code', ({backupCode}) => setBackupCode(backupCode));
  port.on('set-logo-image', ({image}) => setLogoImage(image));
}

function setBrand(brandId) {
  if (!brandId) {
    return;
  }
  let brand;
  switch (brandId) {
    case 'webde':
      brand = 'WEB.DE';
      break;
    case 'gmx':
      brand = 'GMX';
      break;
    default:
      throw new Error('Unknown brand');
  }
  $('html').addClass(brandId);
  $('[data-l10n-id]:contains("[BRAND]")').each(function() {
    const $element = $(this);
    let text = $element.text();
    text = text.replace(/\[BRAND\]/g, brand);
    $element.text(text);
  });
}

function setLogoImage(image) {
  if (image) {
    $('.logo').attr('src', image);
  }
}

function setBackupCode(backupCode) {
  const length = 5;
  let splitCode = '';
  $('.recovery-sheet_code-digit').each(function(index) {
    splitCode = backupCode.slice(length * index, (length * index) + length);
    $(this).text(splitCode);
  });
  $('.recovery-sheet_code-container').addClass('secureBackground');

  new QRCode(document.getElementById('qrcode'), { // eslint-disable-line no-undef
    text: backupCode,
    width: 175,
    height: 175,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H // eslint-disable-line no-undef
  });

  $('.recovery-sheet_print-button').on('click', () => {
    window.print();
  });

  port.emit('backup-code-window-init');
}

$(document).ready(init);
