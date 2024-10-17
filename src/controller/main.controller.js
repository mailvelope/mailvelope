/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {modelInitialized} from '../modules/pgpModel';
import {parseViewName, PromiseQueue} from '../lib/util';
import {initFactory, verifyConnectPermission, createController as createControllerInstance, getControllerClass} from './factory';

export function initController() {
  initFactory();
  chrome.runtime.onConnect.addListener(port => {
    // create controllers for incoming connections by name and id
    addPort(port);
    // update active ports on disconnect
    port.onDisconnect.addListener(removePort);
  });
}

class EventCache {
  constructor(port, addPortSequence) {
    this.port = port;
    this.addPortSequence = addPortSequence;
    this.cache = [];
    this.push = this.push.bind(this);
    this.port.onMessage.addListener(this.push);
  }

  push(event) {
    this.cache.push(event);
  }

  #flushEvent(eventHandler) {
    this.port.onMessage.removeListener(this.push);
    eventHandler.activatePortMessages();
    for (const event of this.cache) {
      eventHandler.handlePortMessage(event);
    }
  }

  flush(eventHandler) {
    eventHandler.deactivatePortMessages();
    // wait for other incoming port connects
    setTimeout(async () => {
      const {id} = parseViewName(this.port.name);
      // check the addPort sequence and wait for last addPort action with the same id to be finished before flush
      const addPortAction = this.addPortSequence.queue.findLast(element => element.args[0].name.includes(id));
      if (addPortAction) {
        await addPortAction.promise;
      }
      this.#flushEvent(eventHandler);
    }, 50);
  }
}

class ControllerTransaction {
  async addPort(port, eventCache) {
    const sender = parseViewName(port.name);
    const subContr = await controllerPool.get(sender.id);
    if (subContr) {
      verifyConnectPermission(subContr.mainType, sender);
      subContr.addPort(port, eventCache);
    } else {
      try {
        await createController(sender.type, port, eventCache);
      } catch (e) {
        console.error(e);
        port.postMessage({event: 'terminate'});
      }
    }
  }
}

const addPortQueue = new PromiseQueue();
const controllerTransaction = new ControllerTransaction();

async function addPort(port) {
  const eventCache = new EventCache(port, addPortQueue);
  await modelInitialized;
  addPortQueue.push(controllerTransaction, 'addPort', [port, eventCache]);
}

async function removePort(port) {
  const id = parseViewName(port.name).id;
  const del = await controllerPool.has(id) && (await controllerPool.get(id)).removePort(port);
  if (del && !(await controllerPool.get(id)).persistent) {
    // last port removed from controller, delete controller
    await controllerPool.delete(id);
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
      const contrConstructor = getControllerClass(ctrlSession.mainType);
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
}

export async function createController(type, port, eventCache) {
  const existingController = (await getAllControllerByType(type))[0];
  if (existingController && existingController.persistent) {
    return existingController;
  }
  const subContr = createControllerInstance(type, port);
  if (!port && !subContr.id) {
    throw new Error('Subcontroller instantiated without port requires id.');
  }
  eventCache?.flush(subContr);
  if (subContr.singleton) {
    // there should be only one instance for this type, new instance overwrites old
    if (existingController) {
      await controllerPool.delete(existingController.id);
    }
  }
  await controllerPool.set(subContr.id, subContr);
  return subContr;
}

async function allPortsConnected(id) {
  const addPortAction = addPortQueue.queue.findLast(element => element.args[0].name.includes(id));
  if (addPortAction) {
    await addPortAction.promise;
  }
}

export async function getAllControllerByType(type) {
  const result = [];
  // wait for last addPort action in queue to finish
  await addPortQueue.queue[addPortQueue.queue.length - 1];
  for (const [, contr] of controllerPool.map.entries()) {
    if (contr.mainType === type) {
      await allPortsConnected(contr.id);
      result.push(contr);
    }
  }
  return result;
}

export const controllerPool = new ControllerMap();

