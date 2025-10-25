/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import './Onboarding.scss';

l10n.register([
  'onboarding_welcome_title',
  'onboarding_welcome_alert',
  'onboarding_welcome_description',
  'onboarding_setup_key_title',
  'onboarding_setup_key_description',
  'onboarding_generate_key',
  'onboarding_import_key',
  'onboarding_skip',
  'onboarding_next',
  'onboarding_back',
  'onboarding_success_title',
  'onboarding_success_message',
  'onboarding_get_started',
  'onboarding_gnupg_title',
  'onboarding_gnupg_description'
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
  const [step, setStep] = useState(1);
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const totalSteps = 3;

  useEffect(() => {
    // Check if user already has a private key
    port.send('has-private-key')
    .then(result => {
      setHasPrivateKey(result);
      // If user already has a key, skip to success screen
      if (result) {
        setStep(3);
      }
    })
    .catch(() => {
      setHasPrivateKey(false);
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

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGetStarted = () => {
    // Navigate to the main app dashboard
    const appUrl = chrome.runtime.getURL('app/app.html#/dashboard');
    window.location.href = appUrl;
  };

  const handleSkip = () => {
    // Skip to success screen
    setStep(3);
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Step indicator */}
        <div className="onboarding-step-indicator">
          {[...Array(totalSteps)].map((_, index) => (
            <div
              key={index}
              className={`step-dot ${index + 1 === step ? 'active' : ''} ${index + 1 < step ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div>
            <h1>{l10n.map.onboarding_welcome_title || 'Welcome to Mailvelope'}</h1>

            <div className="alert alert-primary" role="alert">
              {l10n.map.onboarding_welcome_alert || 'Mailvelope allows you to send and receive encrypted emails using OpenPGP. Let\'s get you set up!'}
            </div>

            <p>
              {l10n.map.onboarding_welcome_description || 'Mailvelope is a browser extension that enables end-to-end encryption for your webmail. Your emails are encrypted directly in your browser, ensuring maximum privacy and security.'}
            </p>

            <div className="onboarding-actions">
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                {l10n.map.onboarding_next || 'Next'}
              </button>
              <button type="button" className="btn btn-link" onClick={handleSkip}>
                {l10n.map.onboarding_skip || 'Skip'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Setup Key */}
        {step === 2 && (
          <div>
            <h1>{l10n.map.onboarding_welcome_title || 'Welcome to Mailvelope'}</h1>

            <div className="alert alert-info" role="alert">
              {l10n.map.onboarding_setup_key_description || 'To use Mailvelope, you need an OpenPGP key pair. You can generate a new key or import an existing one.'}
            </div>

            <div className="onboarding-key-options">
              <div className="option-item">
                <h3>{l10n.map.onboarding_generate_key || 'Generate a new key'}</h3>
                <p>
                  Create a new OpenPGP key pair. This is recommended if you&apos;re new to encrypted email.
                </p>
                <button type="button" className="btn btn-primary" onClick={handleGenerateKey}>
                  {l10n.map.onboarding_generate_key || 'Generate Key'}
                </button>
              </div>

              <div className="option-item">
                <h3>{l10n.map.onboarding_import_key || 'Import an existing key'}</h3>
                <p>
                  If you already have an OpenPGP key pair, you can import it here.
                </p>
                <button type="button" className="btn btn-secondary" onClick={handleImportKey}>
                  {l10n.map.onboarding_import_key || 'Import Key'}
                </button>
              </div>

              <div className="option-item">
                <h3>{l10n.map.onboarding_gnupg_title || 'Connect to GnuPG'}</h3>
                <p>
                  {l10n.map.onboarding_gnupg_description || 'Use your system&apos;s GnuPG installation (advanced users).'}
                </p>
                <button type="button" className="btn btn-link" onClick={handleNext}>
                  Configure later
                </button>
              </div>
            </div>

            <div className="onboarding-actions">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                {l10n.map.onboarding_back || 'Back'}
              </button>
              <button type="button" className="btn btn-link" onClick={handleSkip}>
                {l10n.map.onboarding_skip || 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="onboarding-success">
            <div className="success-icon">
              ✓
            </div>

            <h1>{l10n.map.onboarding_success_title || 'You&apos;re all set!'}</h1>

            <h2>{l10n.map.onboarding_success_message || 'Congrats! You successfully set up Mailvelope.'}</h2>

            <div className="alert alert-success" role="alert">
              {hasPrivateKey
                ? 'Your OpenPGP key is ready to use. You can now send and receive encrypted emails.'
                : 'You can set up your OpenPGP key later from the settings page.'
              }
            </div>

            <div className="onboarding-actions" style={{justifyContent: 'center'}}>
              <button type="button" className="btn btn-primary btn-lg" onClick={handleGetStarted}>
                {l10n.map.onboarding_get_started || 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
