/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID} from '../lib/util';
import {MAIN_KEYRING_ID} from '../lib/constants';
import * as keyring from '../modules/keyring';
import {SubController} from './sub.controller';

export default class OnboardingController extends SubController {
  constructor() {
    super();
    this.mainType = 'onboarding';
    this.id = getUUID();
    this.on('has-private-key', this.hasPrivateKey);
  }

  /**
   * Check if user has at least one private key
   * @return {Promise<Boolean>}
   */
  async hasPrivateKey() {
    try {
      const defaultKeyring = keyring.getById(MAIN_KEYRING_ID);
      const privateKeys = defaultKeyring.keyring.privateKeys.getKeys();
      return privateKeys.length > 0;
    } catch (error) {
      console.error('Error checking for private keys:', error);
      return false;
    }
  }
}
