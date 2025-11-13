/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useState, useEffect, useCallback} from 'react';
import {Route, Link, useHistory} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {port, AppOptions} from '../../app/app';
import {KeyringOptions} from '../../app/keyring/KeyringOptions';
import {MAIN_KEYRING_ID, GNUPG_KEYRING_ID} from '../../lib/constants';
import KeyringSetup from '../../app/keyring/KeyringSetup';
import GenerateKey from '../../app/keyring/GenerateKey';
import KeyImport from '../../app/keyring/KeyImport';
import OnboardingSuccess from './OnboardingSuccess';
import Notifications from '../util/Notifications';

l10n.register([
  'onboarding_welcome_title',
  'onboarding_setup_alert',
  'onboarding_create_key_hint',
  'onboarding_import_key_hint',
  'onboarding_skip'
]);

// Main Onboarding component for use within App
export function Onboarding({gnupg}) {
  const history = useHistory();
  const [keyringData, setKeyringData] = useState({
    keyringId: MAIN_KEYRING_ID,
    keyringAttr: null,
    hasPrivateKey: false,
    keysLoading: true
  });
  const [notifications, setNotifications] = useState([]);

  // TODO: Refactor to avoid duplication with Keyring.js
  const loadKeyringData = useCallback(async () => {
    try {
      const query = new URLSearchParams(document.location.search);
      const keyringIdQuery = query.get('krid') || '';
      const keyringAttr = await port.send('get-all-keyring-attr');
      const keyringId = keyringAttr[keyringIdQuery] ? this.state.keyringId : MAIN_KEYRING_ID;
      const defaultKeyFpr = keyringAttr[keyringId].default_key || '';
      const demail = keyringId.includes('de-mail.de');
      const gnupg = keyringId === GNUPG_KEYRING_ID;
      // propagate state change to backend
      port.emit('set-active-keyring', {keyringId});
      let keys = await port.send('getKeys', {keyringId});
      keys = keys.sort((a, b) => a.name.localeCompare(b.name));
      const hasPrivateKey = keys.some(key => key.type === 'private');

      setKeyringData({
        keyringId, defaultKeyFpr, demail, gnupg, keyringAttr, hasPrivateKey, keys, keysLoading: false
      });

      // If user already has a key, go to success screen
      if (hasPrivateKey && history.location.pathname === '/onboarding') {
        history.push('/onboarding/success');
      }
    } catch (error) {
      console.error('Error loading keyring data:', error);
      setKeyringData(prev => ({...prev, keysLoading: false}));
    }
  }, [history]);

  useEffect(() => {
    loadKeyringData();
  }, [loadKeyringData]);

  const handleKeyringChange = async action => {
    await loadKeyringData();
    // Navigate to success screen after key creation/import
    // Pass action type (generate or import) via query parameter
    history.push(`/onboarding/success?action=${action}`);
  };

  const handleNotification = notification => {
    setNotifications([notification]);
  };

  return (
    <AppOptions.Provider value={{gnupg}}>
      <KeyringOptions.Provider value={{
        keyringId: keyringData.keyringId,
        demail: keyringData.demail,
        gnupg: keyringData.gnupg
      }}>
        <div className="jumbotron">
          <section className="card mv-options">
            <div className="card-body">
              {/* Route: Welcome screen with KeyringSetup */}
              <Route exact path="/onboarding" render={() => (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0">{l10n.map.onboarding_welcome_title}</h2>
                    <Link to="/onboarding/success" className="btn btn-secondary px-4">
                      {l10n.map.onboarding_skip}
                    </Link>
                  </div>
                  <div className="alert alert-success mb-4" role="alert">
                    {l10n.map.onboarding_setup_alert}
                  </div>
                  <KeyringSetup isOnboarding={true} />
                </>
              )} />

              {/* Route: Generate Key */}
              <Route path="/onboarding/generate" render={() => (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0">{l10n.map.keyring_setup_generate_key}</h2>
                    <Link to="/onboarding/success" className="btn btn-secondary px-4">
                      {l10n.map.onboarding_skip}
                    </Link>
                  </div>
                  <div className="alert alert-success mb-4" role="alert">
                    {l10n.map.onboarding_create_key_hint}
                  </div>
                  <GenerateKey
                    onKeyringChange={() => handleKeyringChange('generate')}
                    onNotification={handleNotification}
                    defaultName=""
                    defaultEmail=""
                  />
                </>
              )} />

              {/* Route: Import Key */}
              <Route path="/onboarding/import" render={({location}) => (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="mb-0">{l10n.map.keyring_setup_import_key}</h2>
                    <Link to="/onboarding/success" className="btn btn-secondary px-4">
                      {l10n.map.onboarding_skip}
                    </Link>
                  </div>
                  <div className="alert alert-success mb-4" role="alert">
                    {l10n.map.onboarding_import_key_hint}
                  </div>
                  <KeyImport
                    onKeyringChange={() => handleKeyringChange('import')}
                    onNotification={handleNotification}
                    location={location}
                  />
                </>
              )} />

              {/* Route: Success */}
              <Route path="/onboarding/success" component={OnboardingSuccess} />
            </div>
          </section>
        </div>

        <Notifications items={notifications} hideDelay={5000} />
      </KeyringOptions.Provider>
    </AppOptions.Provider>
  );
}

Onboarding.propTypes = {
  gnupg: PropTypes.bool
};
