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

    emit() {}

    send() {}
  }
};
