/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview Implements provider specific content scripts to query
 * recipients and set sender email addresses in the webmail ui.
 */

import {sequential, isVisible} from '../lib/util';

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
 * @param  {String} hostname - The hostname of the webmail interface
 * @return {Object}   An instanciated module
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
   * @return {Promise.<Array>}   The recipient objects in the form { email: 'jon@example.com' }
   */
  async getRecipients() {
    return [];
  }

  /**
   * Since there is not way to enter recipients in a generic fashion
   * this function does nothing.
   */
  setRecipients() { /* do nothing */ }

  /**
   * Extract sender
   * @return {Promise.<Array>}   sender object in the form { email: 'jon@example.com' }
   */
  async getSender() {
    return [];
  }
}

//
// Gmail module
//

class Gmail {
  /**
   * Parse recipients from the Gmail Webmail interface
   * @return {Promise.<Array>}   The recipient objects in the form { email: 'jon@example.com' }
   */
  async getRecipients() {
    return getAttr(document.querySelectorAll('.oL.aDm span[email], .vR span[email]'), 'email');
  }

  /**
   * Set the recipients in the Gmail Webmail editor.
   */
  setRecipients({recipients = []}) {
    // find the relevant elements in the Gmail interface
    const displayArea = document.querySelector('.aoD.hl'); // email display only area
    const tagRemove = document.querySelectorAll('.fX .vR .vM'); // email tags remove button
    const input = document.querySelectorAll('.fX .vO'); // the actual recipient email address text input (a textarea)
    const subject = document.querySelector('.aoT'); // subject field
    const editor = document.querySelector('.aO7 .Am'); // editor
    input.forEach(element => element.value = '');
    setFocus(displayArea)
    .then(() => {
      tagRemove.forEach(tag => tag.click());
      // enter address text into input
      const text = joinEmail(recipients);
      if (input.length) {
        input.item(0).value = text;
      }
    })
    .then(() => {
      setFocus(isVisible(subject) ? subject : editor);
    });
  }

  /**
   * Extract sender
   * @param {HTMLElement} emailElement - DOM element of displayed email content
   * @return {Promise.<Array>}   sender object in the form { email: 'jon@example.com' }
   */
  async getSender(emailElement) {
    const emailArea = emailElement.closest('.gs');
    if (!emailArea) {
      return [];
    }
    return getAttr(emailArea.querySelectorAll('.cf.ix span[email]'), 'email');
  }
}

//
// Yahoo module
//

class Yahoo {
  /**
   * Parse recipients from the Yahoo Webmail interface
   * @return {Promise.<Array>}   The recipient objects in the form { email: 'jon@example.com' }
   */
  async getRecipients() {
    return getAttr(document.querySelectorAll('.compose-header span[data-address]'), 'data-address');
  }

  /**
   * Set the recipients in the Yahoo Webmail editor.
   */
  setRecipients({recipients = []}) {
    // remove existing recipients
    document.querySelectorAll('.compose-header li.hLozenge').forEach(element => element.remove());
    // enter address text into input
    const text = joinEmail(recipients);
    const input = document.querySelector('.compose-header #to .recipient-input input');
    if (input) {
      input.value = text;
    }
    // trigger change event by switching focus
    setFocus(input)
    .then(() => {
      const subject = document.querySelector('#subject-field');
      // set focus to subject field, or to compose area in the reply case
      setFocus(isVisible(subject) ? subject : document.querySelector('.compose-message .cm-rtetext'));
    });
  }

  /**
   * Extract sender
   * @param {HTMLElement} emailElement - DOM element of displayed email content
   * @return {Promise.<Array>}   sender object in the form { email: 'jon@example.com' }
   */
  async getSender(emailElement) {
    const emailArea = emailElement.closest('.thread-item');
    if (!emailArea) {
      return [];
    }
    return getAttr(emailArea.querySelectorAll('.thread-item-header .contents > .hcard-mailto span[data-address]'), 'data-address');
  }
}

//
// Outlook module
//

class Outlook {
  getRecipients(editElement) {
    // get compose area
    const composeArea = editElement.closest('.conductorContent');
    // find personas in compose are
    const personas = composeArea.querySelectorAll('.PersonaPaneLauncher');
    return sequential(this.extractPersona.bind(this), Array.from(personas));
  }

  waitForPersonaCard(action) {
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
            if (personaCard.length && personaCard.textContent.match(HAS_EMAIL)) {
              clearInterval(searchInterval);
              // still more time required to complete render
              setTimeout(() => resolve({personaCard, addedNode}), 200);
            }
          }, 100);
          setTimeout(() => clearInterval(searchInterval), 1500);
        });
      });
      observer.observe(document.body, {childList: true});
      setTimeout(() => reject(observer.disconnect()), 1000);
      action && action();
    });
  }

  extractPersona(pane) {
    if (!pane) {
      return [];
    }
    // click persona pane to open popup
    return this.waitForPersonaCard(() => pane.click())
    .then(({personaCard, addedNode}) => {
      // hide persona popup
      addedNode.style.display = 'none';
      return getText(personaCard.querySelectorAll('span'));
    })
    .catch(() => []);
  }

  setRecipients({recipients = [], editElement}) {
    // get compose area
    const composeArea = editElement.closest('.conductorContent');
    // remove existing recipients
    composeArea.querySelectorAll('.PersonaPaneLauncher button').forEach(element => element.click());
    // enter address text into input
    const text = joinEmail(recipients);
    const input = composeArea.querySelector('[role="heading"] form input');
    setFocus(input)
    .then(() => input.value = text);
  }

  getSender(emailElement) {
    const emailArea = emailElement.closest('.ShowReferenceAttachmentsLinks');
    if (!emailArea) {
      return [];
    }
    const persona = emailArea.querySelector('.PersonaPaneLauncher');
    return this.extractPersona(persona);
  }
}

/**
 * DOM API util funtions
 */

const IS_EMAIL = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;
const HAS_EMAIL = /[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}/;

/**
 * Filter the text content of a list of elements for email addresses.
 * @param  {NodeList<HTMLElement>} elements - A list of elements to iteralte over
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function getText(elements) {
  return parseEmail(elements, element => {
    // consider only direct text nodes of elements
    const clone = element.cloneNode(false);
    return clone.textContent;
  });
}

/**
 * Filter a certain attribute of a list of elements for email addresses.
 * @param  {NodeList<HTMLElement>} elements - A list of elements to iteralte over
 * @param  {String} attrName - The element's attribute name to query by
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function getAttr(elements, attrName) {
  return parseEmail(elements, element => element.getAttribute(attrName));
}

/**
 * Set focus to element on next tick
 * @param  {HTMLElement} element - element to set focus
 */
function setFocus(element) {
  return new Promise(resolve => {
    setTimeout(() => {
      element && element.focus();
      resolve();
    }, 0);
  });
}

/**
 * Extract emails from list of elements
 * @param  {NodeList<HTMLElement>} elements - A list of jQuery elements to iteralte over
 * @param  {Function} extract - extract function
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function parseEmail(elements, extract) {
  const emails = [];
  for (const element of elements) {
    const value = extract(element);
    if (IS_EMAIL.test(value)) {
      emails.push(value);
    }
  }
  return toRecipients(emails);
}

/**
 * Maps an array of email addresses to an array of recipient objects.
 * @param  {Array} addresses - An array of email addresses
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function toRecipients(addresses) {
  return addresses.map(address => ({
    email: address
  }));
}

/**
 * Maps an array of recipients to a string of email addresses
 * @param  {Array} recipients - The recipient objects in the form { email: 'jon@example.com' }
 * @return {String}   comma separated list of email addresses
 */
function joinEmail(recipients) {
  return recipients.map(r => r.email).join(', ');
}
