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

/**
 * @fileOverview Implements provider specific content scripts to query
 * recipients and set sender email addresses in the webmail ui.
 */

'use strict';

var mvelo = mvelo || {};

mvelo.providers = {};

/**
 * Initializes the map of provider specific modules.
 */
mvelo.providers.init = function() {
  mvelo.providers.map = new Map();
  mvelo.providers.map.set('mail.google.com', new mvelo.providers.Gmail());
  mvelo.providers.map.set('default', new mvelo.providers.Default());
};

/**
 * Lookup function that return the vendor specific module to a hostname.
 * If a hostname if not supported specifically, the default module will
 * be returned.
 * @param  {String} hostname   The hostname of the webmail interface
 * @return {Object}            An instanciated module
 */
mvelo.providers.get = function(hostname) {
  if (mvelo.providers.map.has(hostname)) {
    return mvelo.providers.map.get(hostname);
  } else {
    return mvelo.providers.map.get('default');
  }
};


//
// Provider specific modules
//


(function(mvelo) {

  mvelo.providers.Gmail = Gmail;
  mvelo.providers.Default = Default;


  //
  // Default module ... generic handling for unsupported providers
  //


  function Default() {}

  /**
   * Parse recipients from the DOM for a generic webmail UI.
   * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
   */
  Default.prototype.getRecipients = function() {
    var recipients = [];

    recipients = recipients.concat(dom.getText($('span').filter(':visible')));
    recipients = recipients.concat(dom.getVal($('input, textarea').filter(':visible')));

    return recipients;
  };

  /**
   * Since there is not way to enter recipients in a generic fashion
   * this function does nothing.
   */
  Default.prototype.setRecipients = function() { /* do nothing */ };


  //
  // Gmail module
  //


  function Gmail() {}

  /**
   * Parse recipients from the Gmail Webmail interface
   * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
   */
  Gmail.prototype.getRecipients = function() {
    return dom.getAttr($('.oL.aDm span[email], .vR span[email]'), 'email');
  };

  /**
   * Set tne recipients in the Gmail Webmail editor.
   */
  Gmail.prototype.setRecipients = function(recipients) {
    recipients = recipients || [];
    // find the relevant elements in the Gmail interface
    var displayDiv = $('.oL.aDm'); // displays recipients when focus not on input
    var tagDiv = $('.vR'); // diplays tags for each recipient when focus on input
    var input = $('.vO'); // the actual email address text input (a textarea)
    displayDiv.empty();
    tagDiv.empty();
    input.empty();
    // enter address text into input
    var text = recipients.map(function(r) { return r.email; }).join(', ');
    input.text(text);
    // display recipients in the displayDiv
    recipients.forEach(function(recipient) {
      var email = recipient.email;
      if (EMAIL_REGEX.test(email)) { // validate to prevent XSS
        var span = $('<span email="' + email + '"></span>');
        span.text(recipient.name ? (recipient.name + ' (' + email + ')') : email);
        displayDiv.append(span);
      }
    });
  };


  //
  // DOM api util
  //

  var EMAIL_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/;
  var EMAILS_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;

  var dom = {};

  /**
   * Filter the value of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getVal = function(elements) {
    var recipients = [];
    elements.each(function() {
      recipients = recipients.concat(parse($(this).val()));
    });
    return recipients;
  };

  /**
   * Filter the text content of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getText = function(elements) {
    var recipients = [];
    elements.each(function() {
      if (!$(this).text().match(EMAILS_REGEX)) {
        return;
      }
      // second filtering: only direct text nodes of span elements
      var spanClone = $(this).clone();
      spanClone.children().remove();
      recipients = recipients.concat(parse(spanClone.text()));
    });
    return recipients;
  };

  /**
   * Filter a certain attribute of a list of elements for email addresses.
   * @param  {[type]} elements   A list of jQuery elements to iteralte over
   * @param  {[type]} attrName   The element's attribute name to query by
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  dom.getAttr = function(elements, attrName) {
    var recipients = [];
    elements.each(function() {
      recipients = recipients.concat(parse($(this).attr(attrName)));
    });
    return recipients;
  };

  /**
   * Parse email addresses from string input.
   * @param  {String} text   The input to be matched
   * @return {Array}         The recipient objects in fhe form { email: 'jon@example.com' }
   */
  function parse(text) {
    if (!text) {
      return [];
    }
    var valid = text.match(EMAILS_REGEX);
    if (valid === null) {
      return [];
    }
    return toRecipients(valid);
  }

  /**
   * Maps an array of email addresses to an array of recipient objects.
   * @param  {Array} addresses   An array of email addresses
   * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
   */
  function toRecipients(addresses) {
    return addresses.map(function(address) {
      return {
        email: address
      };
    });
  }

}(mvelo));
