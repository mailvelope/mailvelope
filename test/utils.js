
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
