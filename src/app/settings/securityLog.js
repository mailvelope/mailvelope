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

import mvelo from '../../mvelo';
import $ from 'jquery';
import event from '../util/event';


var $tableBody;
var tableRow;
var logEntryTmpl;
var autoRefresh;
var initialTab = false;
var securityLogLength = 0;

function init() {
  $('#securityLogButton').on('show.bs.tab', function() {
    //console.log('securityLog show.bs.tab');
    if (!initialTab) {
      startSecurityLogMonitoring();
      initialTab = true;
    }
  });
}

export function startSecurityLogMonitoring() {
  $tableBody = $("#secrityLogTable tbody");
  if (logEntryTmpl === undefined) {
    logEntryTmpl = $tableBody.html();
  }
  $tableBody.children().remove();
  updateSecurityLog();
  clearInterval(autoRefresh);
  autoRefresh = window.setInterval(function() {
    updateSecurityLog();
  }, 1000);
}

function updateSecurityLog() {
  mvelo.extension.sendMessage({event: 'get-ui-log', securityLogLength: securityLogLength}, refreshSecurityLog);
}

function refreshSecurityLog(request) {
  securityLogLength += request.secLog.length;

  request.secLog.forEach(function(entry) {
    tableRow = $.parseHTML(logEntryTmpl);
    $(tableRow).find('.timestamp').text((new Date(entry.timestamp)).toLocaleTimeString());
    $(tableRow).find('td:nth-child(1)').attr('title', entry.timestamp);
    $(tableRow).find('td:nth-child(2)').text(entry.sourcei18n);
    $(tableRow).find('td:nth-child(3)').text(entry.typei18n);
    $tableBody.prepend(tableRow);
  });
}

event.on('ready', init);
