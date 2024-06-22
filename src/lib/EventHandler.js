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
  constructor(port, handlers) {
    if (port) {
      this.initPort(port);
    }
    this._handlers = handlers || new Map();
    this._reply = null;
    this._replyCount = 0;
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
    return eventHandler;
  }

  initPort(port) {
    this._port = port;
    this._port.onMessage.addListener(this.handlePortMessage.bind(this));
  }

  removePort() {
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

  get onDisconnect() {
    const obj = {};
    obj.addListener = listener => this._port.onDisconnect.addListener(listener);
    return obj;
  }

  /**
   * Generic port message handler that can be attached via port.onMessage.addListener().
   * Once set up, events can be handled with on('event', function(options) {})
   * @param  {String} options.event   The event descriptor
   * @param  {Object} options         Contains message attributes and data
   */
  handlePortMessage(options = {}) {
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
      const replyHandler = this._reply.get(options._reply);
      this._reply.delete(options._reply);
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
    options.event = event;
    this._port.postMessage(options);
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
      if (!this._reply) {
        this._reply = new Map();
      }
      options.event = event;
      options._reply = ++this._replyCount;
      this._reply.set(options._reply, {resolve, reject});
      this._port.postMessage(options);
    });
  }
}
