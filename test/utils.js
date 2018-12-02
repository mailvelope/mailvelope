
export class Port {
  constructor(name) {
    this.name = name;
    Port.map.set(name, this);
    this.onMessage = {
      listener: null,
      addListener(fn) {
        this.listener = fn;
      }
    };
  }

  postMessage(msg) {
    Port.map.get(msg.to).onMessage.listener(msg);
  }
}

Port.map = new Map();


export class LocalStorageStub {
  constructor(prefix = 'mvelo.keyring') {
    this.prefix = prefix;
    this.storage = new Map();
  }

  importKeys(keyRingId, {public: pub, private: pri}) {
    const publicKeys = [];
    for (const keyName of Object.keys(pub)) {
      publicKeys.push(pub[keyName]);
    }
    this.set(`${this.prefix}.${keyRingId}.publicKeys`, publicKeys);

    const privateKeys = [];
    for (const keyName of Object.keys(pri)) {
      privateKeys.push(pri[keyName]);
    }
    this.set(`${this.prefix}.${keyRingId}.privateKeys`, privateKeys);
  }

  importAttributes(keyRingId, attributes) {
    this.set(`${this.prefix}.attributes`, {[keyRingId]: attributes});
  }

  get(key) {
    return this.storage.get(key);
  }

  set(key, value) {
    this.storage.set(key, value);
  }

  remove(key) {
    this.storage.delete(key);
  }
}
