/**
 * Copyright (C) 2015-2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MAIN_KEYRING_ID, APP_TOP_FRAME_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {parseViewName} from '../lib/util';
import {getSecurityBackground} from '../modules/prefs';

export class SubController extends EventHandler {
  constructor(port) {
    super(port);
    this.ports = {};
    this.peers = {};
    if (port) {
      this.initMainPort(port);
    }
    this.on('open-security-settings', this.openSecuritySettings);
    this.on('get-security-background', this.getSecurityBackground);
    this.on('security-background-update', this.updateSecurityBackground);
  }

  initMainPort(port, eventCache) {
    const sender = parseViewName(port.name);
    this.mainType = sender.type;
    this.id = sender.id;
    this.ports[this.mainType] = this;
    eventCache?.flush(this);
  }

  addPort(port, eventCache) {
    if (!this._port) {
      // controller was instantiated without main port
      super.initPort(port);
      this.initMainPort(port, eventCache);
      return;
    }
    const type = parseViewName(port.name).type;
    this.ports[type] = new EventHandler(port, this._handlers);
    eventCache?.flush(this.ports[type]);
  }

  removePort(port) {
    const view = parseViewName(port.name);
    if (view.id !== this.id) {
      throw new Error('View ID mismatch.');
    }
    delete this.ports[view.type];
    if (view.type === this.mainType) {
      super.clearPort();
    }
    return Object.keys(this.ports).length === 0;
  }

  async createPeer(type) {
    if (this.peers[type]) {
      return;
    }
    this.peers[type] = factory.getPeer(type);
    this.peers[type].peers[this.peerType] = this;
    await controllers.updateSession(this.id, this);
    await controllers.set(this.peers[type].id, this.peers[type]);
  }

  async removePeer(type) {
    if (!this.peers[type]) {
      return;
    }
    await controllers.delete(this.peers[type].id);
    delete this.peers[type];
    await controllers.updateSession(this.id, this);
  }

  async setState(nextState) {
    this.state = {...this.state, ...nextState};
    await controllers.updateSession(this.id, this);
  }

  openSecuritySettings() {
    const hash = '#/settings/security';
    mvelo.tabs.loadAppTab(hash);
  }

  openApp(fragment) {
    const hash = `#${fragment}`;
    mvelo.tabs.loadAppTab(hash);
  }

  getSecurityBackground() {
    return getSecurityBackground();
  }

  updateSecurityBackground() {
    this.ports[this.mainType].emit('update-security-background');
  }
}

class ControllerMap {
  constructor() {
    this.map = new Map();
  }

  async get(id) {
    if (this.map.has(id)) {
      return this.map.get(id);
    }
    const {[id]: ctrlSession} = await chrome.storage.session.get(id);
    if (ctrlSession) {
      const {contrConstructor} = factory.repo.get(ctrlSession.mainType);
      const ctrl = new contrConstructor();
      ctrl.mainType = ctrlSession.mainType; // as mainType in the session might not be default mainType
      ctrl.id = id;
      ctrl.state = ctrlSession.state;
      this.map.set(id, ctrl);
      for (const peer of ctrlSession.peers) {
        const peerCtrl = await this.get(peer.id);
        ctrl.peers[peer.peerType] = peerCtrl;
        peerCtrl.peers[ctrl.peerType] = ctrl;
      }
      return ctrl;
    }
  }

  set(id, ctrl) {
    this.map.set(id, ctrl);
    return this.updateSession(id, ctrl);
  }

  updateSession(id, ctrl) {
    return chrome.storage.session.set({[id]: {
      mainType: ctrl.mainType,
      state: ctrl.state,
      peers: Object.values(ctrl.peers).map(peer => ({id: peer.id, peerType: peer.peerType}))
    }});
  }

  delete(id) {
    this.map.delete(id);
    return chrome.storage.session.remove(id);
  }

  async has(id) {
    const hasSession = await chrome.storage.session.getBytesInUse(id);
    return this.map.has(id) && hasSession;
  }

  async forEach(callback) {
    const all = await chrome.storage.session.get();
    Object.values(all).forEach(obj => {
      if (obj instanceof SubController) {
        callback(obj);
      }
    });
  }
}

const controllers = new ControllerMap();

export const factory = {};

factory.repo = new Map();
factory.peerRepo = new Map();

factory.get = async function(type, port, eventCache) {
  verifyCreatePermission(type, port);
  const existingController = (await getByMainType(type))[0];
  if (existingController && existingController.persistent) {
    return existingController;
  }
  const {contrConstructor} = factory.repo.get(type);
  const subContr = new contrConstructor(port);
  if (!port && !subContr.id) {
    throw new Error('Subcontroller instantiated without port requires id.');
  }
  eventCache?.flush(subContr);
  if (subContr.singleton) {
    // there should be only one instance for this type, new instance overwrites old
    if (existingController) {
      await controllers.delete(existingController.id);
    }
  }
  await controllers.set(subContr.id, subContr);
  return subContr;
};

factory.getPeer = function(type) {
  const contrConstructor = factory.peerRepo.get(type);
  return new contrConstructor();
};

factory.register = function(type, contrConstructor, allowedSecondaryTypes) {
  if (factory.repo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    factory.repo.set(type, {contrConstructor, allowedSecondaryTypes});
  }
};

factory.registerPeer = function(type, contrConstructor) {
  if (factory.peerRepo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    factory.peerRepo.set(type, contrConstructor);
  }
};

/**
 * Verify if port is allowed to create controller
 * All web accessible resources should not be allowed to create a controller,
 * therefore only known IDs can be used to create such dialogs
 * @param  {Object} port
 */
function verifyCreatePermission(type, port) {
  if (!factory.repo.has(type)) {
    // view types not registered in repo are not allowed to create controller
    throw new Error(`No controller found for view type: ${type}`);
  }
  if (!port) {
    return;
  }
  if (type === 'editor') {
    throw new Error('Editor view not allowed to directly create controller.');
  }
  if (type === 'app') {
    const sender = parseViewName(port.name);
    if (sender.id !== APP_TOP_FRAME_ID) {
      throw new Error('App view in embedded frame not allowed to directly create controller.');
    }
  }
}

function verifyConnectPermission(type, sender) {
  if (type === sender.type) {
    return;
  }
  const {allowedSecondaryTypes} = factory.repo.get(type);
  if (!allowedSecondaryTypes.includes(sender.type)) {
    throw new Error(`View type ${sender.type} not allowed to connect to controller.`);
  }
}

class EventCache {
  constructor(port) {
    this.port = port;
    this.cache = [];
    this.push = this.push.bind(this);
    this.port.onMessage.addListener(this.push);
  }

  push(event) {
    this.cache.push(event);
  }

  flush(eventHandler) {
    this.port.onMessage.removeListener(this.push);
    for (const event of this.cache) {
      eventHandler.handlePortMessage(event);
    }
  }
}

export async function addPort(port) {
  const eventCache = new EventCache(port);
  const sender = parseViewName(port.name);
  const subContr = await controllers.get(sender.id);
  if (subContr) {
    verifyConnectPermission(subContr.mainType, sender);
    subContr.addPort(port, eventCache);
  } else {
    try {
      await factory.get(sender.type, port, eventCache);
    } catch (e) {
      console.error(e);
      port.postMessage({event: 'terminate'});
    }
  }
}

export async function removePort(port) {
  const id = parseViewName(port.name).id;
  await removeId(id, port);
}

async function removeId(id, port) {
  const del = await controllers.has(id) && (await controllers.get(id)).removePort(port);
  if (del && !(await controllers.get(id)).persistent) {
    // last port removed from controller, delete controller
    await controllers.delete(id);
  }
}

export function getById(id) {
  return controllers.get(id);
}

export async function getByMainType(type) {
  const result = [];
  await controllers.forEach(contr => {
    if (contr.mainType === type) {
      result.push(contr);
    }
  });
  return result;
}

// keep state of active keyring for App UI
let activeKeyringId = MAIN_KEYRING_ID;

export function setActiveKeyringId(keyringId) {
  activeKeyringId = keyringId;
}

export function getActiveKeyringId() {
  return activeKeyringId;
}

// transfer data to app UI via slots
const appDataSlot = new Map();

export function setAppDataSlot(key, value) {
  appDataSlot.set(key, value);
}

export function getAppDataSlot(key) {
  const value = appDataSlot.get(key);
  appDataSlot.delete(key);
  return value;
}

function destroyNodes(subControllers) {
  postToNodes(subControllers, 'destroy');
}

function postToNodes(subControllers, event) {
  subControllers.forEach(subContr => {
    subContr.ports[subContr.mainType].emit(event);
  });
}

export async function reloadFrames() {
  // close frames
  destroyNodes(await getByMainType('dFrame'));
  destroyNodes(await getByMainType('dFrameGmail'));
  destroyNodes(await getByMainType('aFrameGmail'));
  destroyNodes(await getByMainType('vFrame'));
  destroyNodes(await getByMainType('eFrame'));
  destroyNodes(await getByMainType('imFrame'));
  destroyNodes(await getByMainType('mainCS'));
}
