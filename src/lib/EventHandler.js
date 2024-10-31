/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {mapError} from './util.js';

/**
 * Event handler is an abstraction on top of Port to support methods 'on', 'emit' and 'send'.
 * @param {Port} port - port object received from runtime.connect()
 * @param {Map} handlers - handler map of parent event handler
 */
export default class EventHandler {
  #reply;
  #replyCount = 0;
  #uninstallListener = [];
  #uninstallInterval;
  #portName;
  #activePortMessages = true;
  #connectListener = [];
  #disconnectListener = [];

  constructor(port, handlers) {
    if (port) {
      this.initPort(port);
    }
    this._handlers = handlers || new Map();
    this._handlerObject = null;
  }

  /**
   * Open port to background script
   * @param  {String} sender identifier of sender (type + id)
   * @return {EventHandler}        initialized EventHandler
   */
  static connect(sender, handlerObject) {
    const eventHandler = new EventHandler(chrome.runtime.connect({name: sender}));
    eventHandler._handlerObject = handlerObject;
    chrome.runtime.onMessage.addListener(eventHandler.handleRuntimeMessage.bind(eventHandler));
    setTimeout(() => eventHandler.triggerConnectListener(), 0);
    return eventHandler;
  }

  activatePortMessages() {
    this.#activePortMessages = true;
  }

  deactivatePortMessages() {
    this.#activePortMessages = false;
  }

  #checkConnection() {
    if (this._port) {
      return;
    }
    const port = chrome.runtime.connect({name: this.#portName});
    this.initPort(port);
    this.triggerConnectListener();
  }

  handleRuntimeMessage(msg) {
    switch (msg.event) {
      case 'reconnect':
        this.#checkConnection();
        break;
    }
  }

  initPort(port) {
    this._port = port;
    this._port.onMessage.addListener(this.handlePortMessage.bind(this));
    this.#portName = port.name;
    if (this._port.onDisconnect) {
      this._port.onDisconnect.addListener(() => this.handleDisconnect());
      for (const listener of this.#disconnectListener) {
        this._port.onDisconnect.addListener(listener);
      }
    }
  }

  handleDisconnect() {
    this.clearPort();
    this.#reply?.forEach(({reject}) => reject({message: 'The Mailvelope service worker was shutdown after 30s of inactivity. Please try again.', code: 'INTERNAL_ERROR'}));
    this.#reply = null;
    this.#replyCount = 0;
  }

  clearPort() {
    this._port = null;
  }

  /**
   * Disconnect port
   */
  disconnect() {
    if (this._port) {
      this._port.disconnect();
    }
  }

  /**
   * We can detect an uninstall event if the field chrome.runtime.id is cleared
   */
  #checkUninstall() {
    if (chrome.runtime?.id) {
      return;
    }
    for (const listener of this.#uninstallListener) {
      listener();
    }
    clearInterval(this.#uninstallInterval);
  }

  get onDisconnect() {
    const obj = {};
    obj.addListener = listener => {
      this._port.onDisconnect.addListener(listener);
      this.#disconnectListener.push(listener);
    };
    return obj;
  }

  get onConnect() {
    const obj = {};
    obj.addListener = listener => this.#connectListener.push(listener);
    return obj;
  }

  triggerConnectListener() {
    this.#connectListener.forEach(listener => listener());
  }

  get onUninstall() {
    const obj = {};
    obj.addListener = listener => {
      this.#uninstallListener.push(listener);
      if (!this.#uninstallInterval) {
        this.#uninstallInterval = setInterval(() => this.#checkUninstall(), 2000);
      }
    };
    return obj;
  }

  /**
   * Generic port message handler that can be attached via port.onMessage.addListener().
   * Once set up, events can be handled with on('event', function(options) {})
   * @param  {String} options.event   The event descriptor
   * @param  {Object} options         Contains message attributes and data
   */
  handlePortMessage(options = {}) {
    if (!this.#activePortMessages) {
      return;
    }
    if (this._handlers.has(options.event)) {
      const handler = this._handlers.get(options.event);
      if (options._reply) {
        // sender expects reply
        Promise.resolve()
        .then(() => handler.call(this, options))
        .then(result => this.emit('_reply', {result, _reply: options._reply}))
        .catch(error => this.emit('_reply', {error: mapError(error), _reply: options._reply}));
      } else {
        // normal one way communication
        handler.call(this, options);
      }
    } else if (options.event === '_reply') {
      // we have received a reply
      const replyHandler = this.#reply.get(options._reply);
      this.#reply.delete(options._reply);
      if (options.error) {
        replyHandler.reject(options.error);
      } else {
        replyHandler.resolve(options.result);
      }
    } else {
      console.log('Unknown event', options);
    }
  }

  /**
   * The new event handling style to asign a function to an event.
   * @param  {String} event       The event descriptor
   * @param  {Function} handler   The event handler
   */
  on(event, handler) {
    if (!event || typeof event !== 'string' || event === '_reply' || typeof handler !== 'function') {
      throw new Error('Invalid event handler!');
    }
    this._handlers.set(event, handler.bind(this._handlerObject || this));
  }

  /**
   * Helper to emit events via postMessage using a port.
   * @param  {String} event     The event descriptor
   * @param  {Object} options   (optional) Data to be sent in the event
   */
  emit(event, options = {}) {
    if (!event || typeof event !== 'string') {
      throw new Error('Invalid event!');
    }
    this.#checkConnection();
    options.event = event;
    this._port.postMessage(options);
  }

  trigger(event, options = {}) {
    if (!event || typeof event !== 'string') {
      throw new Error('Invalid event!');
    }
    options.event = event;
    if (!this._handlers.has(options.event)) {
      throw new Error('Unknown event!');
    }
    const handler = this._handlers.get(options.event);
    handler.call(this, options);
  }

  /**
   * Like emit but receiver can send response
   * @param  {String} event     The event descriptor
   * @param  {Object} options   (optional) Data to be sent in the event
   * @param  {Object} port      (optional) The port to be used. If
   *                            not specified, the main port is used.
   * @return {Promise}
   */
  send(event, options = {}) {
    return new Promise((resolve, reject) => {
      if (!event || typeof event !== 'string') {
        return reject(new Error('Invalid event!'));
      }
      this.#checkConnection();
      if (!this.#reply) {
        this.#reply = new Map();
      }
      options.event = event;
      options._reply = ++this.#replyCount;
      this.#reply.set(options._reply, {resolve, reject});
      this._port.postMessage(options);
    });
  }
}
