import EventHandler from 'lib/EventHandler';

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

/**
 * Creates a mock port for testing components that use EventHandler.connect
 * @param {Object} sandbox - Sinon sandbox for stubbing
 * @param {Object} sendResponseMap - Optional map of event -> response for send method
 * @param {Object} options - Additional options
 * @param {boolean} options.includeConnectListeners - Whether to include onConnect/onDisconnect (default: true)
 * @returns {Object} The mock port object
 */
export function createMockPort(sandbox, sendResponseMap = {}, options = {}) {
  const {includeConnectListeners = true} = options;

  const portMock = {
    _events: {
      emit: [],
      on: [],
      send: []
    },
    on: event => portMock._events.on.push(event),
    emit: event => portMock._events.emit.push(event),
    send: event => {
      portMock._events.send.push(event);
      return new Promise(resolve => {
        // Check if there's a specific response configured for this event
        const response = sendResponseMap[event];
        resolve(response !== undefined ? response : event);
      });
    }
  };

  // Add connect/disconnect listeners if needed (used by some components)
  if (includeConnectListeners) {
    portMock.onConnect = {
      addListener() {}
    };
    portMock.onDisconnect = {
      addListener() {}
    };
  }

  sandbox.stub(EventHandler, 'connect').returns(portMock);
  return portMock;
}
