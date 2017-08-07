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

/* eslint strict: 0 */
'use strict';

var mvelo = mvelo || null; // eslint-disable-line no-var
var QRCode = QRCode || null; // eslint-disable-line no-var

(function() {
  // communication to background page
  let port;
  // shares ID with KeyBackup Frame
  let id;
  // type + id
  let name;

  function init() {
    const qs = jQuery.parseQuerystring();
    id = qs.id;
    name = `backupCodeWindow-${id}`;
    // open port to background page
    port = mvelo.extension.connect({name});
    port.onMessage.addListener(messageListener);

    const formattedDate = new Date();

    $('#currentDate').html(formattedDate.toLocaleDateString());
    if (mvelo.crx) {
      mvelo.l10n.localizeHTML();
    }
    setBrand(qs.brand);
    mvelo.util.showSecurityBackground(qs.embedded);
    port.postMessage({event: 'get-logo-image', sender: name});
    port.postMessage({event: 'get-backup-code', sender: name});
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

    new QRCode(document.getElementById('qrcode'), {
      text: backupCode,
      width: 175,
      height: 175,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    $('.recovery-sheet_print-button').on('click', () => {
      window.print();
    });

    port.postMessage({event: 'backup-code-window-init', sender: name});
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'set-backup-code':
        setBackupCode(msg.backupCode);
        break;
      case 'set-logo-image':
        setLogoImage(msg.image);
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
}());
