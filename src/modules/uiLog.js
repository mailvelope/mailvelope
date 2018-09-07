/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';

const l10n = mvelo.l10n.getMessage;

const log = [];
let logTimer = 0;

/**
 * Push messages to the log
 * @param {String} source - the source dialog of the user interaction
 * @param {String} type - the type of the user interaction
 * @param {String|Array} substitutions - substitutions for type
 */
export function push(source, type, substitutions) {
  const entry = {
    source,
    sourcei18n: l10n(source),
    type,
    typei18n: l10n(type, substitutions),
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
  if (logTimer) {
    clearTimeout(logTimer);
  } else {
    setBadge();
  }
  logTimer = setTimeout(clearBadge, 2000);
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
