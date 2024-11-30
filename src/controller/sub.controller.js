/**
 * Copyright (C) 2015-2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MAIN_KEYRING_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {parseViewName} from '../lib/util';
import {getSecurityBackground} from '../modules/prefs';
import {controllerPool, getAllControllerByType} from './main.controller';
import {createPeerController, isMainComponentType} from './factory';

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
    const {type} = parseViewName(port.name);
    if (!this._port && isMainComponentType(type, this)) {
      // controller was instantiated without main port
      super.initPort(port);
      this.initMainPort(port, eventCache);
      return;
    }
    this.ports[type] = new EventHandler(port, this._handlers);
    eventCache?.flush(this.ports[type]);
  }

  hasPort(...args) {
    return Boolean(this.getPort(...args));
  }

  getPort(...args) {
    for (const portName in this.ports) {
      if (args.some(name => portName.includes(name))) {
        return this.ports[portName];
      }
    }
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
    this.peers[type] = createPeerController(type);
    this.peers[type].peers[this.peerType] = this;
    await controllerPool.updateSession(this.id, this);
    await controllerPool.set(this.peers[type].id, this.peers[type]);
  }

  async removePeer(type) {
    if (!this.peers[type]) {
      return;
    }
    await controllerPool.delete(this.peers[type].id);
    delete this.peers[type];
    await controllerPool.updateSession(this.id, this);
  }

  async setState(nextState) {
    this.state = {...this.state, ...nextState};
    await controllerPool.updateSession(this.id, this);
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
    subContr.ports[subContr.mainType]?.emit(event);
  });
}

export async function reloadFrames() {
  // close frames
  destroyNodes(await getAllControllerByType('dFrame'));
  destroyNodes(await getAllControllerByType('dFrameGmail'));
  destroyNodes(await getAllControllerByType('aFrameGmail'));
  destroyNodes(await getAllControllerByType('vFrame'));
  destroyNodes(await getAllControllerByType('eFrame'));
  destroyNodes(await getAllControllerByType('imFrame'));
  destroyNodes(await getAllControllerByType('mainCS'));
}
