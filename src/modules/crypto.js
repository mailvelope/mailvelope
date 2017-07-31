/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';


import mvelo from 'lib-mvelo';

export function randomString(length) {
  var result = '';
  var base = 32;
  var buf = new Uint8Array(length);
  mvelo.util.getDOMWindow().crypto.getRandomValues(buf);
  for (var i = 0; i < buf.length; i++) {
    result += (buf[i] % base).toString(base);
  }
  return result;
}
