/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';

export class SubController extends mvelo.EventHandler {
  constructor(port) {
    super();
    this.ports = {};
    if (port) {
      var sender = parseViewName(port.name);
      this.mainType = sender.type;
      this.id = sender.id;
      this.ports[this.mainType] = port;
    }
  }

  addPort(port) {
    var type = parseViewName(port.name).type;
    this.ports[type] = port;
  }

  removePort(port) {
    if (Object.keys(this.ports).length === 0) {
      // controllers instantiated without port should not be deleted
      return false;
    }
    if (port.name) {
      var view = parseViewName(port.name);
      if (view.id !== this.id) {
        throw new Error('View ID mismatch.');
      }
      delete this.ports[view.type];
    } else {
      var that = this;
      Object.keys(this.ports).forEach(function(type) {
        if (that.ports[type].ref === port) {
          delete that.ports[type];
        }
      });
    }
    return Object.keys(this.ports).length === 0;
  }

  openSecuritySettings() {
    var hash = '#/settings/security';
    mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
      if (old) {
        mvelo.tabs.sendMessage(tab, {
          event: 'reload-options',
          hash: hash
        });
      }
    });
  }

  openApp({fragment}) {
    let hash = `#${fragment}`;

    mvelo.tabs.loadOptionsTab(hash, (old, tab) => {
      if (old) {
        mvelo.tabs.sendMessage(tab, {
          event: 'reload-options',
          hash: hash
        });
      }
    });
  }
}

export const factory = {};

factory.repo = new Map();

factory.get = function(type, port) {
  if (factory.repo.has(type)) {
    let contrConstructor = factory.repo.get(type);
    let subContr = new contrConstructor(port);
    if (subContr.singleton) {
      // there should be only one instance for this type, new instance overwrites old
      let existingController = getByMainType(type)[0];
      if (existingController) {
        controllers.delete(existingController.id);
      }
    }
    if (!port) {
      if (!subContr.id) {
        throw new Error('Subcontroller instantiated without port requires id.');
      }
      controllers.set(subContr.id, subContr);
    }
    return subContr;
  } else {
    throw new Error('No controller found for view type: ' + type);
  }
};

factory.register = function(type, contrConstructor) {
  if (factory.repo.has(type)) {
    throw new Error('Subcontroller class already registered.');
  } else {
    factory.repo.set(type, contrConstructor);
  }
};

const controllers = new Map();

function parseViewName(viewName) {
  var pair = viewName.split('-');
  return { type: pair[0], id: pair[1] };
}

export function addPort(port) {
  var sender = parseViewName(port.name);
  var subContr = controllers.get(sender.id);
  if (subContr) {
    subContr.addPort(port);
  } else {
    var newContr = factory.get(sender.type, port);
    controllers.set(sender.id, newContr);
  }
}

export function removePort(port) {
  if (port.name) {
    let id = parseViewName(port.name).id;
    removeId(id, port);
  } else {
    for (let id of controllers.keys()) {
      removeId(id, port);
    }
  }
}

function removeId(id, port) {
  let del = controllers.has(id) && controllers.get(id).removePort(port);
  if (del) {
    // last port removed from controller, delete controller
    controllers.delete(id);
  }
}

export function handlePortMessage(msg) {
  var id = parseViewName(msg.sender).id;
  getByID(id).handlePortMessage(msg);
}

export function getByID(id) {
  return controllers.get(id);
}

export function getByMainType(type) {
  let result = [];
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
var activeKeyringId = mvelo.LOCAL_KEYRING_ID;

export function setActiveKeyringId(keyringId) {
  activeKeyringId = keyringId;
}

export function getActiveKeyringId() {
  return activeKeyringId;
}

// transfer data to app UI via slots
var appDataSlot = new Map();

export function setAppDataSlot(key, value) {
  appDataSlot.set(key, value);
}

export function getAppDataSlot(key) {
  let value = appDataSlot.get(key);
  appDataSlot.delete(key);
  return value;
}
