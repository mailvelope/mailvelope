/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../mvelo';
import libChrome from '../chrome/lib/lib-mvelo';
import libFirefox from '../firefox/lib/lib-mvelo';

const libMvelo = mvelo.crx ? libChrome : libFirefox;

export default libMvelo;
