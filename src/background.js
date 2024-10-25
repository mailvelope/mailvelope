/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2017 Mailvelope GmbH
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

import {initAnalytics} from './lib/analytics';
import {initBrowserRuntime} from './lib/browser.runtime';
import {init as initModel} from './modules/pgpModel';
import {init as initKeyring, initGPG} from './modules/keyring';
import {initController} from './controller/main.controller';
import {initScriptInjection, initAuthRequestApi} from './lib/inject';

async function main() {
  initAnalytics();
  initBrowserRuntime();
  initController();
  initAuthRequestApi();
  await initModel();
  initScriptInjection();
  await initKeyring();
  initGPG();
}

main();
