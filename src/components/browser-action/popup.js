/**
 * Copyright (C) 2014-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/* eslint strict: 0 */
'use strict';

var mvelo = mvelo || null; // eslint-disable-line no-var

(function() {
  let activeState;
  let logEntryTmpl;
  let logEmptyTmpl;
  let port;

  function init() {
    port = mvelo.EventHandler.connect('menu-59edbbeb9affc4004a916276');
    $('#showlog').hide();
    $('.popup')
    .off()
    .on('click', 'a', hide)
    .on('click', 'button', function() {
      // id of dropdown entry = action
      if (this.id === 'state' || this.id === '') {
        return;
      }
      port.emit('browser-action', {action: this.id});
      hide();
    });

    mvelo.l10n.localizeHTML();

    if (!logEntryTmpl) {
      logEntryTmpl = $('#activityLog .logEntry').parent().html();
    }

    if (!logEmptyTmpl) {
      logEmptyTmpl = $('#emptySecurityLog').parent().html();
    }

    port.send('get-prefs')
    .then(prefs => {
      activeState = prefs.main_active;
      handleAppActivation();
    });
    port.send('get-ui-log')
    .then(initUILog);

    $('#state')
    .off()
    .on('click', () => {
      const event = activeState ? 'deactivate' : 'activate';
      activeState = !activeState;
      handleAppActivation();
      port.emit(event);
      hide();
    });

    $('[data-toggle="tooltip"]').tooltip();
  }

  function initUILog(secLog) {
    let logEntry;
    let cnt = 0;
    $('#activityLog').empty();
    if (!secLog || secLog.length === 0) {
      $('#activityLog').append(logEmptyTmpl);
    }
    secLog.reverse().forEach(entry => {
      $('#showlog').show();
      if (cnt < 3) {
        logEntry = $.parseHTML(logEntryTmpl);
        $(logEntry).find('.timestamp').text((new Date(entry.timestamp)).toLocaleTimeString());
        $(logEntry).find('.logDescription').text(entry.typei18n);
        $('#activityLog').append(logEntry);
      }
      cnt++;
    });
  }

  function hide() {
    $(document.body).fadeOut(() => window.close());
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

  $(document).ready(init);
}());
