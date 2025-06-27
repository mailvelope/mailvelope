export class LocalStorageStub {
  constructor(prefix = 'mvelo.keyring') {
    this.prefix = prefix;
    this.storage = new Map();
    this.set(`${this.prefix}.attributes`, {});
  }

  async importKeys(keyRingId, {public: pub, private: prv}) {
    await this.set(`${this.prefix}.${keyRingId}.publicKeys`, pub);
    await this.set(`${this.prefix}.${keyRingId}.privateKeys`, prv);
  }

  async importAttributes(keyRingId, attrs) {
    const attributes = await this.get(`${this.prefix}.attributes`);
    attributes[keyRingId] = attrs;
  }

  get(key) {
    return Promise.resolve(this.storage.get(key));
  }

  set(key, value) {
    return Promise.resolve(this.storage.set(key, value));
  }

  remove(key) {
    return Promise.resolve(this.storage.delete(key));
  }
}
