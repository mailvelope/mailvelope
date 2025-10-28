/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {useHistory} from 'react-router-dom';
import * as l10n from '../../lib/l10n';

l10n.register([
  'onboarding_success_title',
  'onboarding_success_message',
  'onboarding_success_alert',
  'onboarding_get_started'
]);

export default function OnboardingSuccess() {
  const history = useHistory();

  const handleGetStarted = () => {
    history.push('/dashboard');
  };

  return (
    <div className="text-center">
      <h1 className="mb-4">{l10n.map.onboarding_success_title || "You're all set!"}</h1>

      <div className="alert alert-success d-flex align-items-center justify-content-between mb-4" role="alert">
        <span>{l10n.map.onboarding_success_alert || 'You can find Mailvelope in the extension menu here'}</span>
        <img
          src={chrome.runtime.getURL('img/onboarding/extension-menu-icon-1a5cf5.png')}
          alt="Extension menu"
          style={{width: '82px', height: '67px', flexShrink: 0}}
        />
      </div>

      <h2 className="mb-5">{l10n.map.onboarding_success_message || 'Congrats! You successfully set up Mailvelope.'}</h2>

      <div className="my-5 d-flex justify-content-center">
        <img
          src={chrome.runtime.getURL('img/onboarding/success-illustration.svg')}
          alt="Success"
          style={{width: '221px', height: '221px'}}
        />
      </div>

      <div className="d-flex justify-content-center mt-4">
        <button type="button" className="btn btn-primary" onClick={handleGetStarted}>
          {l10n.map.onboarding_get_started || 'Get Started'}
        </button>
      </div>
    </div>
  );
}
