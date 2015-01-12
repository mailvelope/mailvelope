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

var mvelo = mvelo || null;

(function() {

  var crx = typeof chrome !== 'undefined';
  var sendMessage;
  if (!crx) {
    // Firefox
    sendMessage = function(msg) {
      addon.postMessage(msg);
    };
    addon.on('message', messageListener);
  } else {
    // Chrome
    sendMessage = function(msg) {
      chrome.runtime.sendMessage(msg, messageListener);
    };
  }

  function init() {
    $('.dropdown-menu').on('click', 'li', function(event) {
      // id of dropdown entry = action
      if (this.id === 'state' || this.id === '') {
        return;
      }
      var message = {
        event: 'browser-action',
        action: this.id
      };
      sendMessage(message);
      hide();
    });
    sendMessage({event: 'get-prefs'});
    $('#activeState').on('change', function() {
      var msg;
      if (this.checked) {
        msg = {event: 'activate'};
      } else {
        msg = {event: 'deactivate'};
      }
      disableOptions(this.checked);
      // wait for animation to finish
      setTimeout(function() {
        sendMessage(msg);
        hide();
      }, 600);
    });
    if (mvelo.crx) {
      mvelo.l10n.localizeHTML();
    }
  }

  function hide() {
    if (crx) {
      $(document.body).fadeOut(function() {
        window.close();
      });
    }
  }

  function disableOptions(state) {
    if (state) {
      $('#reload').removeClass('disabled').css('pointer-events', 'auto');
    } else {
      $('#reload').addClass('disabled').css('pointer-events', 'none');
    }
  }

  function messageListener(msg) {
    switch (msg.event) {
      case 'get-prefs':
        $('#activeState').prop('checked', msg.prefs.main_active);
        disableOptions(msg.prefs.main_active);
        setTimeout(function() {
          $('.switch-light').removeClass('no-transition');
        }, 10);
        break;
    }
  }

  $(document).ready(init);

}());
