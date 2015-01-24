/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2014  Thomas Oberndörfer
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

define(function(require, exports, module) {

  function SubController(port) {
    this.mvelo = require('../../lib-mvelo').mvelo;
    this.prefs = require('../prefs');
    this.model = require('../pgpModel');
    this.ports = {};
    if (port) {
      var sender = this.parseViewName(port.name);
      this.mainType = sender.type;
      this.id = sender.id;
      this.ports[this.mainType] = port;
    }
  }

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

  SubController.prototype.handlePortMessage = function(port) {
    throw new Error('Abstract method.');
  };

  var factory = {};
  factory.repo = {};

  factory.get = function(type, port) {
    if (factory.repo[type]) {
      var ClassName = factory.repo[type];
      var subContr = new ClassName(port);
      if (!port) {
        if (!subContr.id) {
          throw new Error('Subcontroller instantiated without port requires id.');
        }
        controllers[subContr.id] = subContr;
      }
      return subContr;
    } else {
      throw new Error('No controller found for view type: ' + type);
    }
  };

  factory.register = function(type, controllerClass) {
    if (factory.repo[type]) {
      throw new Error('Subcontroller class already registered.');
    } else {
      factory.repo[type] = controllerClass;
    }
  };

  var controllers = {};

  function addPort(port) {
    var sender = parseViewName(port.name);
    var subContr = controllers[sender.id];
    if (subContr) {
      subContr.addPort(port);
    } else {
      var newContr = factory.get(sender.type, port);
      controllers[sender.id] = newContr;
    }
  }

  function removePort(port) {
    var subContrIDs;
    if (port.name) {
      var id = parseViewName(port.name).id;
      subContrIDs = [id];
    } else {
      subContrIDs = Object.keys(controllers);
    }
    subContrIDs.forEach(function(id) {
      var del = controllers[id] && controllers[id].removePort(port);
      if (del) {
        delete controllers[id];
      }
    });
  }

  function handlePortMessage(msg) {
    var id = parseViewName(msg.sender).id;
    getByID(id).handlePortMessage(msg);
  }

  function getByID(id) {
    for (var contrID in controllers) {
      if (controllers.hasOwnProperty(contrID) &&
          contrID === id) {
        return controllers[contrID];
      }
    }
  }

  function getByMainType(type) {
    var result = [];
    for (var contrID in controllers) {
      if (controllers.hasOwnProperty(contrID) &&
          controllers[contrID].mainType === type) {
        result.push(controllers[contrID]);
      }
    }
    return result;
  }

  function isActive(type) {
    return getByMainType(type).length !== 0;
  }

  function parseViewName(viewName) {
    var pair = viewName.split('-');
    return { type: pair[0], id: pair[1] };
  }

  exports.SubController = SubController;
  exports.addPort = addPort;
  exports.removePort = removePort;
  exports.handlePortMessage = handlePortMessage;
  exports.factory = factory;
  exports.getByID = getByID;
  exports.getByMainType = getByMainType;
  exports.isActive = isActive;

});
