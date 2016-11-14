/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview Implements provider specific content scripts to query
 * recipients and set sender email addresses in the webmail ui.
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';

let providerMap = null;

/**
 * Initializes the map of provider specific modules.
 */
export function init() {
  providerMap = new Map();
  providerMap.set('mail.google.com', new Gmail());
  providerMap.set('mail.yahoo.com', new Yahoo());
  providerMap.set('outlook.live.com', new Outlook());
  providerMap.set('default', new Default());
}

/**
 * Lookup function that return the vendor specific module to a hostname.
 * If a hostname if not supported specifically, the default module will
 * be returned.
 * @param  {String} hostname   The hostname of the webmail interface
 * @return {Object}            An instanciated module
 */
export function get(hostname) {
  if (providerMap.has(hostname)) {
    return providerMap.get(hostname);
  } else {
    return providerMap.get('default');
  }
}

//
// Provider specific modules
//

//
// Default module ... generic handling for unsupported providers
//

class Default {
  /**
   * Parse recipients from the DOM has not been reliable for generic webmail
   */
  getRecipients() { /* do nothing */ }
  /**
   * Since there is not way to enter recipients in a generic fashion
   * this function does nothing.
   */
  setRecipients() { /* do nothing */ }
}

//
// Gmail module
//

class Gmail {
  /**
   * Parse recipients from the Gmail Webmail interface
   * @return {Array}   The recipient objects in the form { email: 'jon@example.com' }
   */
  getRecipients() {
    return Promise.resolve(dom.getAttr($('.oL.aDm span[email], .vR span[email]'), 'email'));
  }
  /**
   * Set the recipients in the Gmail Webmail editor.
   */
  setRecipients({recipients = []}) {
    // find the relevant elements in the Gmail interface
    var displayArea = $('.aoD.hl'); // email display only area
    var tagRemove = $('.fX .vR .vM'); // email tags remove button
    var input = $('.fX .vO'); // the actual recipient email address text input (a textarea)
    var subject = $('.aoT'); // subject field
    var editor = $('.aO7 .Am'); // editor
    input.val('');
    dom.setFocus(displayArea)
    .then(function() {
      tagRemove.click();
      // enter address text into input
      var text = joinEmail(recipients);
      input.first().val(text);
    })
    .then(function() {
      dom.setFocus(subject.is(':visible') ? subject : editor);
    });
  }
}

//
// Yahoo module
//

class Yahoo {
  /**
   * Parse recipients from the Yahoo Webmail interface
   * @return {Array}   The recipient objects in the form { email: 'jon@example.com' }
   */
  getRecipients() {
    return Promise.resolve(dom.getAttr($('.compose-header span[data-address]'), 'data-address'));
  }
  /**
   * Set the recipients in the Yahoo Webmail editor.
   */
  setRecipients({recipients = []}) {
    // remove existing recipients
    $('.compose-header li.hLozenge').remove();
    // enter address text into input
    var text = joinEmail(recipients);
    var input = $('.compose-header #to .recipient-input input');
    input.val(text);
    // trigger change event by switching focus
    dom.setFocus(input)
    .then(function() {
      // set focus to subject field, or to compose area in the reply case
      dom.setFocus($('#subject-field').is(':visible') ? $('#subject-field') : $('.compose-message .cm-rtetext'));
    });
  }
}

//
// Outlook module
//

class Outlook {
  getRecipients(editElement) {
    // get compose area
    const composeArea = editElement.parents('.conductorContent').first();
    // find personas in compose are
    const personas = composeArea.find('.PersonaPaneLauncher').get();
    return mvelo.util.sequential(this.extractPersona.bind(this), personas);
  }

  waitForPersonaCard() {
    return new Promise((resolve, reject) => {
      // create observer to wait for persona popup
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (!mutation.addedNodes.length) {
            return;
          }
          const addedNode = mutation.addedNodes.item(0);
          observer.disconnect();
          // wait in interval for popup content to render
          const searchInterval = setInterval(() => {
            const personaCard = addedNode.getElementsByClassName('groupPivotPersonaCard');
            if (personaCard.length && $(personaCard).text().match(HAS_EMAIL)) {
              clearInterval(searchInterval);
              resolve(personaCard);
            }
          }, 100);
          setTimeout(() => clearInterval(searchInterval), 1500);
        });
      });
      observer.observe(document.body, {childList: true});
      setTimeout(() => reject(observer.disconnect()), 1000);
    });
  }

  extractPersona(pane) {
    // click persona pane to open popup
    $(pane).click();
    return this.waitForPersonaCard()
    .then(personaCard => dom.getText($(personaCard).find('span')))
    .catch(() => []);
  }

  setRecipients({recipients = [], editElement}) {
    // get compose area
    const composeArea = editElement.parents('.conductorContent').first();
    // remove existing recipients
    composeArea.find('.PersonaPaneLauncher button').click();
    // enter address text into input
    const text = joinEmail(recipients);
    const input = $('[role="heading"] form input').first();
    dom.setFocus(input)
    .then(() => input.val(text));
  }
}

//
// DOM api util
//

const IS_EMAIL = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
const HAS_EMAIL = /[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}/;

var dom = {};

/**
 * Filter the text content of a list of elements for email addresses.
 * @param  {jQuery} elements   A list of jQuery elements to iteralte over
 * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
 */
dom.getText = function(elements) {
  return parseEmail(elements, (element) => element.text());
};

/**
 * Filter a certain attribute of a list of elements for email addresses.
 * @param  {jQuery} elements   A list of jQuery elements to iteralte over
 * @param  {String} attrName   The element's attribute name to query by
 * @return {Array}             The recipient objects in fhe form { email: 'jon@example.com' }
 */
dom.getAttr = function(elements, attrName) {
  return parseEmail(elements, (element) => element.attr(attrName));
};

/**
 * Set focus to element on next tick
 * @param  {jQuery} element jQuery element to set focus
 */
dom.setFocus = function(element) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      element.focus();
      resolve();
    }, 0);
  });
};

dom.waitTick = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Extract emails from list of elements
 * @param  {jQuery} elements    A list of jQuery elements to iteralte over
 * @param  {Function} extract   extract function
 * @return {Array}              The recipient objects in fhe form { email: 'jon@example.com' }
 */
function parseEmail(elements, extract) {
  var emails = [];
  elements.each(function() {
    const value = extract($(this));
    if (IS_EMAIL.test(value)) {
      emails.push(value);
    }
  });
  return toRecipients(emails);
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

/**
 * Maps an array of recipients to a string of email addresses
 * @param  {Array} recipients The recipient objects in the form { email: 'jon@example.com' }
 * @return {String}           comma separated list of email addresses
 */
function joinEmail(recipients) {
  return recipients.map(function(r) { return r.email; }).join(', ');
}
