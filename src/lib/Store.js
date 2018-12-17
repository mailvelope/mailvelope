/**
 * Copyright (C) 2015-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from './lib-mvelo';

export default class Store {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.map = new Map();
  }

  async init() {
    if (this.initalized) {
      return;
    }
    const attributes = await mvelo.storage.get(this.storageKey);
    if (attributes) {
      Object.keys(attributes).forEach(key => this.map.set(key, attributes[key]));
    }
    this.initialized = true;
  }

  // TODO: make get and put async for reuse in KeyringAttr
  // expose a callbackApi separately

  get(key, cb) {
    this.init()
    .then(cb(undefined, this.map.get(key)));
  }

  put(key, val, cb) {
    this.init()
    .then(this.map.set(key, val))
    .then(this.store())
    .then(cb());
  }

  async store() {
    await mvelo.storage.set(this.storageKey, this.toObject());
  }

  toObject() {
    const all = {};
    this.map.forEach((value, key) => all[key] = value);
    return all;
  }
}
