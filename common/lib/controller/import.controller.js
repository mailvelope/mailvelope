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

  var sub = require('./sub.controller');

  function ImportController(port) {
    sub.SubController.call(this, port);
  }

  ImportController.prototype = Object.create(sub.SubController.prototype);

  ImportController.prototype.handlePortMessage = function(msg) {
    var that = this;
    switch (msg.event) {
      case 'imframe-armored-key':
        this.mvelo.tabs.loadOptionsTab('', function(old, tab) {
          that.mvelo.tabs.sendMessage(tab, {
            event: "import-key",
            armored: msg.data,
            id: that.id,
            old: old
          });
        });
        break;
      default:
        console.log('unknown event', msg);
    }
  };

  exports.ImportController = ImportController;

});
