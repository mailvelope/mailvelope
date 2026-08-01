export default {
  SubController: class MockSubController {
    constructor(port) {
      this.port = port;
      this._handlers = new Map();
      this.ports = {};
      this.peers = {};
      this.state = {};
    }

    on(event, handler) {
      this._handlers.set(event, handler);
    }

    setState(newState) {
      this.state = {...this.state, ...newState};
    }

    getPort(...args) {
      for (const portName in this.ports) {
        if (args.some(name => portName.includes(name))) {
          return this.ports[portName];
        }
      }
    }

    hasPort(...args) {
      return Boolean(this.getPort(...args));
    }

    emit() {}

    send() {}
  }
};
