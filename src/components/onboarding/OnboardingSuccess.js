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
  'action_menu_setup_start_label'
]);

export default function OnboardingSuccess() {
  const history = useHistory();

  const handleGetStarted = () => {
    history.push('/dashboard');
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-3 flex-grow-1">{l10n.map.onboarding_success_title}</h2>
          <h4 className="mb-4">{l10n.map.onboarding_success_message}</h4>
        </div>
        <div className="w-50 alert alert-success d-none d-md-flex justify-content-between align-items-center" role="alert">
          <span>{l10n.map.onboarding_success_alert}</span>
          <img
            className="ms-4"
            src="/img/extension-location.svg"
            alt="Extension menu location"
          />
        </div>
      </div>

      <div className="my-5 d-flex justify-content-center">
        <img
          src="/img/success-illustration.svg"
          alt="Success"
          style={{width: '221px', height: '221px'}}
        />
      </div>

      <div className="d-flex justify-content-center mt-4">
        <button type="button" className="btn btn-primary" onClick={handleGetStarted}>
          {l10n.map.action_menu_setup_start_label}
        </button>
      </div>
    </>
  );
}
