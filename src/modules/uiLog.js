/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as l10n from '../lib/l10n';

const log = [];
let logTimer = 0;

/**
 * Push messages to the log
 * @param {String} source - the source dialog of the user interaction
 * @param {String} type - the type of the user interaction
 * @param {String|Array} substitutions - substitutions for type
 * @param {Boolean} [userAction=true] - this log entry is the result of a direct user interaction on the Mailvelope UI
 */
export function push(source, type, substitutions, userAction = true) {
  const entry = {
    source,
    sourcei18n: l10n.get(source),
    type,
    typei18n: l10n.get(type, substitutions),
    timestamp: (new Date()).toISOString()
  };
  const lastEntry = log[log.length - 1];
  if (lastEntry &&
      source === lastEntry.source &&
      type === lastEntry.type &&
      (type === 'security_log_textarea_input' || type === 'security_log_password_input')) {
    // aggregate text input events
    log[log.length - 1] = entry;
  } else {
    log.push(entry);
  }
  if (userAction) {
    showIndicator();
  }
}

function showIndicator(duration = 2000) {
  if (logTimer) {
    clearTimeout(logTimer);
  } else {
    setBadge();
  }
  logTimer = setTimeout(clearBadge, duration);
}

function setBadge() {
  mvelo.browserAction.state({
    badge: 'Ok',
    badgeColor: '#29A000'
  });
}

function clearBadge() {
  logTimer = 0;
  mvelo.browserAction.state({
    badge: ''
  });
}

export function getAll() {
  return log;
}

export function getLatest(offset) {
  return log.slice(offset);
}
