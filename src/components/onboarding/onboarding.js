/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import FAQCard from './FAQCard';
import OptionCard from './OptionCard';
import './Onboarding.scss';

l10n.register([
  'onboarding_welcome_title',
  'onboarding_welcome_alert',
  'onboarding_setup_alert',
  'onboarding_generate_key',
  'onboarding_import_key',
  'onboarding_skip',
  'onboarding_success_title',
  'onboarding_success_message',
  'onboarding_success_alert',
  'onboarding_get_started',
  'onboarding_create_key_title',
  'onboarding_create_key_description',
  'onboarding_import_key_title',
  'onboarding_import_key_description',
  'onboarding_import_key_button'
]);

let port;

document.addEventListener('DOMContentLoaded', init);

function init() {
  l10n.mapToLocal();
  port = EventHandler.connect('onboarding');

  const root = document.createElement('div');
  ReactDOM.render((
    <Onboarding />
  ), document.body.appendChild(root));
}

function Onboarding() {
  // Check URL parameters for screen override (for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlScreen = urlParams.get('screen');
  const initialScreen = urlScreen && ['welcome', 'success'].includes(urlScreen) ? urlScreen : 'welcome';

  const [screen, setScreen] = useState(initialScreen);
  const totalSteps = 2;

  useEffect(() => {
    // Check if user already has a private key
    port.send('has-private-key')
    .then(result => {
      // If user already has a key, skip to success screen
      if (result) {
        setScreen('success');
      }
    })
    .catch(() => {
      // No action needed if check fails
    });
  }, []);

  const handleGenerateKey = () => {
    // Navigate to key generation in the main app
    const appUrl = chrome.runtime.getURL('app/app.html#/keyring/generate?onboarding=true');
    window.location.href = appUrl;
  };

  const handleImportKey = () => {
    // Navigate to key import in the main app
    const appUrl = chrome.runtime.getURL('app/app.html#/keyring/import?onboarding=true');
    window.location.href = appUrl;
  };

  const handleSkip = () => {
    // Navigate to the main app dashboard
    const appUrl = chrome.runtime.getURL('app/app.html#/dashboard');
    window.location.href = appUrl;
  };

  const handleGetStarted = () => {
    // Navigate to the main app dashboard
    const appUrl = chrome.runtime.getURL('app/app.html#/dashboard');
    window.location.href = appUrl;
  };

  // Calculate current step for indicator
  const getCurrentStep = () => {
    switch (screen) {
      case 'welcome':
        return 1;
      case 'success':
        return 2;
      default:
        return 1;
    }
  };

  const currentStep = getCurrentStep();

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Step indicator */}
        <div className="onboarding-step-indicator">
          {[...Array(totalSteps)].map((_, index) => (
            <div
              key={index}
              className={`step-dot ${index + 1 === currentStep ? 'active' : ''} ${index + 1 < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Screen 1: Welcome */}
        {screen === 'welcome' && (
          <div className="onboarding-screen">
            <h1>{l10n.map.onboarding_welcome_title || 'Welcome to Mailvelope'}</h1>

            <div className="alert alert-success" role="alert">
              {l10n.map.onboarding_setup_alert || 'Now you have to set up your keys! This will take 5 minutes'}
            </div>

            <div className="row g-4">
              {/* Main content area with two option cards */}
              <div className="col-12 col-lg-8">
                <div className="row row-cols-1 row-cols-md-2 g-3">
                  <OptionCard
                    title={l10n.map.onboarding_create_key_title || 'Create a new key'}
                    description={l10n.map.onboarding_create_key_description || 'Generate a new PGP key pair to start encrypting and signing your emails securely.'}
                    buttonText={l10n.map.onboarding_generate_key || 'Generate Key'}
                    onClick={handleGenerateKey}
                    icon="🔑"
                    borderColor="border-danger"
                  />
                  <OptionCard
                    title={l10n.map.onboarding_import_key_title || 'Import a key you have'}
                    description={l10n.map.onboarding_import_key_description || 'Already have a PGP key? Import it from a file or clipboard to continue using your existing key.'}
                    buttonText={l10n.map.onboarding_import_key_button || 'Import key from a file'}
                    onClick={handleImportKey}
                    icon="📥"
                    borderColor="border-primary"
                  />
                </div>
              </div>

              {/* FAQ Sidebar */}
              <div className="col-12 col-lg-4">
                <FAQCard />
              </div>
            </div>

            {/* Skip button footer */}
            <div className="onboarding-footer text-end mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={handleSkip}>
                {l10n.map.onboarding_skip || 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* Screen 2: Success */}
        {screen === 'success' && (
          <div className="onboarding-screen onboarding-success">
            <h1>{l10n.map.onboarding_success_title || "You're all set!"}</h1>

            <div className="alert alert-success extension-alert" role="alert">
              <span>{l10n.map.onboarding_success_alert || 'You can find Mailvelope in the extension menu here'}</span>
              <img
                src={chrome.runtime.getURL('img/onboarding/extension-menu-icon-1a5cf5.png')}
                alt="Extension menu"
                className="extension-icon"
              />
            </div>

            <h2>{l10n.map.onboarding_success_message || 'Congrats! You successfully set up Mailvelope.'}</h2>

            <div className="success-illustration">
              <img
                src={chrome.runtime.getURL('img/onboarding/success-illustration.svg')}
                alt="Success"
                className="success-icon-img"
              />
            </div>

            <div className="onboarding-actions center">
              <button type="button" className="btn btn-primary" onClick={handleGetStarted}>
                {l10n.map.onboarding_get_started || 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
