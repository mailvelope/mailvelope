/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview Implements provider specific content scripts to query
 * recipients and set sender email addresses in the webmail ui.
 */

import {sequential, isVisible} from '../lib/util';
import {goog} from '../modules/closure-library/closure/goog/emailaddress';
import GmailIntegration from './gmailIntegration';

let providerMap = null;
let prefs = null;

/**
 * Initializes the map of provider specific modules.
 */
export function init(preferences) {
  prefs = preferences;
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
  constructor() {
    if (prefs.provider.gmail_integration) {
      this.integration = new GmailIntegration();
      this.integration.init();
    }
  }

  /**
   * Parse recipients from the Gmail Webmail interface
   * @return {Promise.<Array>}   The recipient objects in the form { email: 'jon@example.com' }
   */
  async getRecipients(editElement) {
    return getAttr(editElement.closest('.I5').querySelectorAll('.agb .afV[data-hovercard-id]'), 'data-hovercard-id');
  }

  /**
   * Set the recipients in the Gmail Webmail editor.
   */
  setRecipients({recipients = [], editElement}) {
    const containerElement = editElement.closest('.I5');
    // find the relevant elements in the Gmail interface
    const displayArea = containerElement.querySelector('.aoD.hl'); // email display only area
    const tagRemove = containerElement.querySelectorAll('.afV[data-hovercard-id] .afX'); // email tags remove button
    const input = containerElement.querySelectorAll('.agP.aFw'); // the actual recipient email address text input (a textarea)
    const subject = containerElement.querySelector('.aoT'); // subject field
    const editor = containerElement.querySelector('.Am.Al'); // editor
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
    const recipientElements = document.querySelectorAll('.compose-header [data-test-id="container-to"] [data-test-id="pill"]');
    return getAttr(recipientElements, 'title');
  }

  /**
   * Set the recipients in the Yahoo Webmail editor.
   */
  setRecipients({recipients = []}) {
    const input = document.querySelector('.compose-header [data-test-id="container-to"] ul.pill-list > li.pill-container input.input-to');
    const inputValue = joinEmail(recipients);
    setReactValue(input, inputValue);
    // trigger change event by switching focus
    setFocus(input)
    .then(() => {
      const subject = document.querySelector('[data-test-id="compose-subject"]');
      // set focus to subject field, or to compose area in the reply case
      setFocus(isVisible(subject) ? subject : document.querySelector('[id="editor-container"] > [data-test-id="rte"]'));
    });

    // remove existing recipients afterwards
    setTimeout(() => {
      document.querySelectorAll('.compose-header [data-test-id="container-to"] ul.pill-list > li:not(.pill-container)').forEach(element => {
        const dataElement = element.querySelector('[data-test-id="pill"]');
        const emailAddress = goog.format.EmailAddress.parse(dataElement.getAttribute('title'));
        if (emailAddress.isValid() && !recipients.find(({email}) => email === emailAddress.getAddress())) {
          element.click();
          element.querySelector('.pill-close button').click();
        }
      });
    }, 250);
  }

  /**
   * Extract sender
   * @param {HTMLElement} emailElement - DOM element of displayed email content
   * @return {Promise.<Array>}   sender object in the form { email: 'jon@example.com' }
   */
  async getSender(emailElement) {
    const emailArea = emailElement.closest('.message-view');
    if (!emailArea) {
      return [];
    }
    const senderElements = emailArea.querySelectorAll('header [data-test-id="message-from"] [data-test-id="email-pill"]:first-of-type > span > span');
    return getText(senderElements);
  }
}

//
// Outlook module
//

class Outlook {
  getRecipients(editElement) {
    return new Promise(resolve => {
      // get compose area
      const composeArea = editElement.closest('[role="main"]');
      // find personas in compose are
      const personas = composeArea.querySelectorAll('[data-selection-index] .lpc-hoverTarget');
      setTimeout(() => {
        resolve(sequential(this.extractPersona.bind(this), Array.from(personas)));
      }, 500);
    });
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
            const personaCard = addedNode.querySelector('[data-log-name="Email"] button');
            if (personaCard && personaCard.textContent.match(HAS_EMAIL)) {
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
    const composeArea = editElement.closest('[role="main"]');
    // remove existing recipients
    setTimeout(() => {
      composeArea.querySelectorAll('[data-selection-index] button[class*=removeWellItemButton]').forEach(element => element.click());
    }, 250);
    // enter address text into input
    const input = composeArea.querySelector('.ms-BasePicker-input');
    sequential(this.setRecipient.bind(this), recipients.map(({email}) => ({email, input}))).then(() => input.blur());
  }

  setRecipient({email, input}) {
    return new Promise(resolve => {
      setReactValue(input, email);
      const keyEnter = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        keyCode: 13
      });
      setTimeout(() => {
        resolve([input.dispatchEvent(keyEnter)]);
      }, 500);
    });
  }

  async getSender(emailElement) {
    return new Promise(resolve => {
      const emailArea = emailElement.closest('.item-part, .item-reading-pane');
      if (!emailArea) {
        resolve([]);
      }
      setTimeout(() => {
        const senderElement = emailArea.querySelector('.item-header-actions > div .lpc-hoverTarget div span');
        if (!senderElement) {
          resolve([]);
        }
        resolve(getText([senderElement]));
      }, 500);
    });
  }
}

/**
 * DOM API util funtions
 */

const HAS_EMAIL = /[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}/;

/**
 * Filter the text content of a list of elements for email addresses.
 * @param  {NodeList<HTMLElement>} elements - A list of elements to iteralte over
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function getText(elements) {
  return parseEmail(elements, element => element.textContent);
}

/**
 * Filter a certain attribute of a list of elements for email addresses.
 * @param  {NodeList<HTMLElement>} elements - A list of elements to iteralte over
 * @param  {String} attrName - The optional element's attribute name to query by
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

function setReactValue(input, value) {
  input.focus();
  input.value = value;
  const event = new Event('input', {bubbles: true});
  const tracker = input._valueTracker;
  if (tracker) {
    tracker.setValue('');
  }
  input.dispatchEvent(event);
}

/**
 * Extract emails from list of elements
 * @param  {NodeList<HTMLElement>} elements - A list of HTML elements to iteralte over
 * @param  {Function} extract - extract function
 * @return {Array}   The recipient objects in fhe form { email: 'jon@example.com' }
 */
function parseEmail(elements, extract) {
  const emails = [];
  for (const element of elements) {
    const value = extract(element);
    const emailAddress = goog.format.EmailAddress.parse(value);
    if (emailAddress.isValid()) {
      emails.push(emailAddress.getAddress());
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
