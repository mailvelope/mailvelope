/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
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

(function() {
  // id of encrypt frame that triggered this dialog
  var parentID;
  var eFrame;

  function init() {
    var qs = jQuery.parseQuerystring();
    parentID = qs['id'];
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    eFrame = new EncryptFrame();
    getTabid(function(tabid) {
      eFrame.attachTo($('#richEditor'), false, tabid);
    });
  }

  function getTabid(callback) {
    if (mvelo.crx) {
      mvelo.extension.sendMessage({event: "get-tabid"}, function(response) {
        callback(response.tabid);
      });
    } else {
      callback(0);
    }
  }

  function onCancel() {
    window.close();
    return false;
  }

  function onTransfer() {
    var armored = $('#richEditor').val();
    eFrame.transferArmored(parentID, armored);
    window.close();
    return true;
  }

  $(document).ready(init);
  
}());