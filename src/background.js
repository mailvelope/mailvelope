/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2017 Mailvelope GmbH
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

import * as controller from './controller/main.controller';
import {initScriptInjection} from './lib/inject';

function init() {
  controller.init()
  .then(() => {
    initConnectionManager();
    initScriptInjection();
  });
}

init();

function initConnectionManager() {
  // store incoming connections by name and id
  chrome.runtime.onConnect.addListener(port => {
    //console.log('ConnectionManager: onConnect:', port);
    controller.portManager.addPort(port);
    port.onMessage.addListener(controller.portManager.handlePortMessage);
    // update active ports on disconnect
    port.onDisconnect.addListener(controller.portManager.removePort);
  });
}
