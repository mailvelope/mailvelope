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

/* eslint strict: 0 */
'use strict';

var mvelo = mvelo || null; // eslint-disable-line no-var

(function() {
  let activeState;
  let logEntryTmpl;
  let logEmptyTmpl;

  function init() {
    $('#showlog').hide();
    $('.popup')
    .off()
    .on('click', 'a', hide)
    .on('click', 'button', function() {
      // id of dropdown entry = action
      if (this.id === 'state' || this.id === '') {
        return;
      }
      const message = {
        event: 'browser-action',
        action: this.id
      };
      sendMessage(message);
      hide();
    });

    mvelo.l10n.localizeHTML();

    if (logEntryTmpl === undefined) {
      logEntryTmpl = $('#activityLog .logEntry').parent().html();
    }

    if (logEmptyTmpl === undefined) {
      logEmptyTmpl = $('#emptySecurityLog').parent().html();
    }

    sendMessage({event: 'get-prefs'});
    sendMessage({event: 'get-ui-log'});

    $('#state')
    .off()
    .on('click', () => {
      let msg;
      if (activeState) {
        msg = {event: 'deactivate'};
      } else {
        msg = {event: 'activate'};
      }
      activeState = !activeState;
      handleAppActivation();
      sendMessage(msg);
      hide();
    });

    $('[data-toggle="tooltip"]').tooltip();
  }

  function hide() {
    $(document.body).fadeOut(() => {
      window.close();
    });
  }

  function handleAppActivation() {
    if (activeState) {
      $('#state .glyphicon').removeClass('glyphicon-unchecked').addClass('glyphicon-check');
      $('#add').removeClass('disabled').css('pointer-events', 'auto');
      $('#reload').removeClass('disabled').css('pointer-events', 'auto');
    } else {
      $('#state .glyphicon').removeClass('glyphicon-check').addClass('glyphicon-unchecked');
      $('#add').addClass('disabled').css('pointer-events', 'none');
      $('#reload').addClass('disabled').css('pointer-events', 'none');
    }
  }

  function sendMessage(msg) {
    chrome.runtime.sendMessage(msg, messageListener);
  }

  function messageListener(msg = {}) {
    switch (msg.event) {
      case 'init':
        init();
        break;
      case 'get-prefs':
        activeState = msg.prefs.main_active;
        handleAppActivation();
        break;
      case 'get-ui-log': {
        let logEntry;
        let cnt = 0;
        $('#activityLog').empty();
        if (!msg.secLog || msg.secLog.length === 0) {
          $('#activityLog').append(logEmptyTmpl);
        }
        msg.secLog.reverse().forEach(entry => {
          $('#showlog').show();
          if (cnt < 3) {
            logEntry = $.parseHTML(logEntryTmpl);
            $(logEntry).find('.timestamp').text((new Date(entry.timestamp)).toLocaleTimeString());
            $(logEntry).find('.logDescription').text(entry.typei18n);
            $('#activityLog').append(logEntry);
          }
          cnt++;
        });
        break;
      }
    }
  }

  $(document).ready(init);
}());
