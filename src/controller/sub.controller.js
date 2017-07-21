/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014-2015 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';


var mvelo = require('lib-mvelo');

function SubController(port) {
  this.mvelo = mvelo;
  this.prefs = require('../modules/prefs');
  this.model = require('../modules/pgpModel');
  this.ports = {};
  if (port) {
    var sender = this.parseViewName(port.name);
    this.mainType = sender.type;
    this.id = sender.id;
    this.ports[this.mainType] = port;
  }
}

SubController.prototype = Object.create(mvelo.EventHandler.prototype); // add new event api functions

SubController.prototype.addPort = function(port) {
  var type = this.parseViewName(port.name).type;
  this.ports[type] = port;
};

SubController.prototype.removePort = function(port) {
  if (Object.keys(this.ports).length === 0) {
    // controllers instantiated without port should not be deleted
    return false;
  }
  if (port.name) {
    var view = this.parseViewName(port.name);
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
};

SubController.prototype.parseViewName = parseViewName;

SubController.prototype.openSecuritySettings = function() {
  var hash = '#/settings/security';
  var that = this;

  this.mvelo.tabs.loadOptionsTab(hash, function(old, tab) {
    if (old) {
      that.mvelo.tabs.sendMessage(tab, {
        event: 'reload-options',
        hash: hash
      });
    }
  });
};

SubController.prototype.openApp = function({fragment}) {
  let hash = `#${fragment}`;

  this.mvelo.tabs.loadOptionsTab(hash, (old, tab) => {
    if (old) {
      this.mvelo.tabs.sendMessage(tab, {
        event: 'reload-options',
        hash: hash
      });
    }
  });
};


var factory = {};

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

let controllers = new Map();

function addPort(port) {
  var sender = parseViewName(port.name);
  var subContr = controllers.get(sender.id);
  if (subContr) {
    subContr.addPort(port);
  } else {
    var newContr = factory.get(sender.type, port);
    controllers.set(sender.id, newContr);
  }
}

function removePort(port) {
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

function handlePortMessage(msg) {
  var id = parseViewName(msg.sender).id;
  getByID(id).handlePortMessage(msg);
}

function getByID(id) {
  return controllers.get(id);
}

function getByMainType(type) {
  let result = [];
  controllers.forEach(contr => {
    if (contr.mainType === type) {
      result.push(contr);
    }
  });
  return result;
}

function isActive(type) {
  return getByMainType(type).length !== 0;
}

function parseViewName(viewName) {
  var pair = viewName.split('-');
  return { type: pair[0], id: pair[1] };
}

var activeKeyringId = mvelo.LOCAL_KEYRING_ID;

function setActiveKeyringId(keyringId) {
  activeKeyringId = keyringId;
}

function getActiveKeyringId() {
  return activeKeyringId;
}

exports.SubController = SubController;
exports.addPort = addPort;
exports.removePort = removePort;
exports.handlePortMessage = handlePortMessage;
exports.factory = factory;
exports.getByID = getByID;
exports.getByMainType = getByMainType;
exports.isActive = isActive;
exports.setActiveKeyringId = setActiveKeyringId;
exports.getActiveKeyringId = getActiveKeyringId;
