/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';

export function randomString(length) {
  let result = '';
  const base = 32;
  const buf = new Uint8Array(length);
  mvelo.util.getDOMWindow().crypto.getRandomValues(buf);
  for (let i = 0; i < buf.length; i++) {
    result += (buf[i] % base).toString(base);
  }
  return result;
}
