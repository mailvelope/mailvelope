import {initController, controllerPool} from '../../../src/controller/main.controller';

const mockAddPort = jest.fn();

jest.mock('../../../src/modules/pgpModel', () => ({
  modelInitialized: Promise.resolve()
}));
jest.mock('../../../src/controller/factory', () => {
  class FakeController {
    constructor(port) {
      [this.mainType, this.id] = port.name.split('-');
      this.ports = {[this.mainType]: port};
      this.peers = {};
      this.state = {};
    }

    addPort(port) {
      this.ports[port.name.split('-')[0]] = port;
      mockAddPort(port.name);
    }

    activatePortMessages() {}

    deactivatePortMessages() {}

    handlePortMessage() {}
  }
  return {
    initFactory: jest.fn(),
    verifyConnectPermission: jest.fn(),
    getControllerClass: jest.fn(),
    createController: jest.fn((type, port) => new FakeController(port))
  };
});

async function withTimeout(promise, label, ms = 500) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: addPort queue hung > ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, guard]);
  } finally {
    clearTimeout(timer);
  }
}

describe('main.controller addPort queue', () => {
  beforeAll(() => initController());

  it('drains a wake-up burst that creates two controllers of the same type', async () => {
    const lastPortAdded = new Promise(resolve => mockAddPort.mockImplementation(name => name === 'dDialog-Y' && resolve()));
    // ports of all frames reach onConnect in one burst after the background wakes up
    for (const name of ['dFrameGmail-X', 'dFrameGmail-Y', 'dDialog-X', 'dDialog-Y']) {
      chrome.runtime.connect({name});
    }
    await withTimeout(lastPortAdded, 'two dFrameGmail controllers');
    expect(Object.keys(controllerPool.map.get('X').ports)).toEqual(['dFrameGmail', 'dDialog']);
    expect(Object.keys(controllerPool.map.get('Y').ports)).toEqual(['dFrameGmail', 'dDialog']);
  });
});
