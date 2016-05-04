/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014 Mailvelope GmbH
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

'use strict';

var mvelo = mvelo || {};

mvelo.providers = {};

mvelo.providers.init = function() {
  mvelo.providers.map = new Map();
  //mvelo.providers.map.set('mail.google.com', new mvelo.providers.Gmail());
  mvelo.providers.map.set('default', new mvelo.providers.Default());
};

mvelo.providers.get = function(hostname) {
  if (mvelo.providers.map.has(hostname)) {
    return mvelo.providers.map.get(hostname);
  } else {
    return mvelo.providers.map.get('default');
  }
};

(function(mvelo) {

  var EMAIL_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;

  //
  // Provider specific modules
  //

  mvelo.providers.Default = Default;
  mvelo.providers.Gmail = Gmail;

  //
  // Default module ... generic handling for unsupported providers
  //

  function Default() {}

  Default.prototype.getRecipients = function() {
    var recipients = []; // structure: [{ name: 'Jon Smith', address: 'jon@example.com' }]

    function addRecipients(addresses) {
      recipients = recipients.concat(addresses.map(function(address) {
        return {address: address};
      }));
    }

    $('span').filter(':visible').each(function() {
      var valid = $(this).text().match(EMAIL_REGEX);
      if (valid === null) {
        return;
      }
      // second filtering: only direct text nodes of span elements
      var spanClone = $(this).clone();
      spanClone.children().remove();
      valid = spanClone.text().match(EMAIL_REGEX);
      if (valid === null) {
        return;
      }
      addRecipients(valid);
    });

    $('input, textarea').filter(':visible').each(function() {
      var valid = $(this).val().match(EMAIL_REGEX);
      if (valid !== null) {
        addRecipients(valid);
      }
    });

    return recipients;
  };

  Default.prototype.setRecipients = function() {};

  //
  // Gmail module
  //

  function Gmail() {}

  Gmail.prototype.getRecipients = function() {};

  Gmail.prototype.setRecipients = function() {};

}(mvelo));
