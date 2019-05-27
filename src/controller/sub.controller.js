/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import {MAIN_KEYRING_ID, APP_TOP_FRAME_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {getSecurityBackground} from '../modules/prefs';

export class SubController extends EventHandler {
  constructor(port) {
    super(port);
    this.ports = {};
    if (port) {
      this.initMainPort(port);
    }
    this.on('open-security-settings', this.openSecuritySettings);
    this.on('get-security-background', this.getSecurityBackground);
    this.on('security-background-update', this.updateSecurityBackground);
  }

  initMainPort(port) {
    const sender = parseViewName(port.name);
    this.mainType = sender.type;
    this.id = sender.id;
    this.ports[this.mainType] = this;
  }

  addPort(port) {
    if (!this._port) {
      // controller was instantiated without main port
      super.initPort(port);
      this.initMainPort(port);
      return;
    }
    const type = parseViewName(port.name).type;
    this.ports[type] = new EventHandler(port, this._handlers);
  }

  removePort(port) {
    if (Object.keys(this.ports).length === 0) {
      // controllers instantiated without port should not be deleted
      return false;
    }
    const view = parseViewName(port.name);
    if (view.id !== this.id) {
      throw new Error('View ID mismatch.');
    }
    delete this.ports[view.type];
    return Object.keys(this.ports).length === 0;
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

export const factory = {};

factory.repo = new Map();

factory.get = function(type, port) {
  verifyCreatePermission(type, port);
  const existingController = getByMainType(type)[0];
  if (existingController && existingController.persistent) {
    return existingController;
  }
  const {contrConstructor} = factory.repo.get(type);
  const subContr = new contrConstructor(port);
  if (!port && !subContr.id) {
    throw new Error('Subcontroller instantiated without port requires id.');
  }
  if (subContr.singleton) {
    // there should be only one instance for this type, new instance overwrites old
    if (existingController) {
      controllers.delete(existingController.id);
    }
  }
  controllers.set(subContr.id, subContr);
  return subContr;
};

factory.register = function(type, contrConstructor, allowedSecondaryTypes) {
  if (factory.repo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    factory.repo.set(type, {contrConstructor, allowedSecondaryTypes});
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

const controllers = new Map();

export function parseViewName(viewName) {
  const pair = viewName.split('-');
  if (pair.length !== 2) {
    throw new Error('Invalid view name.');
  }
  return {type: pair[0], id: pair[1]};
}

function verifyConnectPermission(type, sender) {
  if (type === sender.type) {
    return;
  }
  const {allowedSecondaryTypes} = factory.repo.get(type);
  if (!allowedSecondaryTypes.includes(sender.type)) {
    throw new Error('View type not allowed to connect to controller.');
  }
}

export function addPort(port) {
  const sender = parseViewName(port.name);
  const subContr = controllers.get(sender.id);
  if (subContr) {
    verifyConnectPermission(subContr.mainType, sender);
    subContr.addPort(port);
  } else {
    try {
      factory.get(sender.type, port);
    } catch (e) {
      console.error(e);
      port.postMessage({event: 'terminate'});
    }
  }
}

export function removePort(port) {
  const id = parseViewName(port.name).id;
  removeId(id, port);
}

function removeId(id, port) {
  const del = controllers.has(id) && !controllers.get(id).persistent && controllers.get(id).removePort(port);
  if (del) {
    // last port removed from controller, delete controller
    controllers.delete(id);
  }
}

export function getById(id) {
  return controllers.get(id);
}

export function getByMainType(type) {
  const result = [];
  controllers.forEach(contr => {
    if (contr.mainType === type) {
      result.push(contr);
    }
  });
  return result;
}

export function isActive(type) {
  return getByMainType(type).length !== 0;
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
