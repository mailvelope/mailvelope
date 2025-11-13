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
  'action_menu_setup_start_label',
  'onboarding_success_created_key_title',
  'onboarding_success_created_key_text',
  'onboarding_success_imported_key_title',
  'onboarding_success_imported_key_text',
  'onboarding_success_need_help',
  'onboarding_success_help_text'
]);

export default function OnboardingSuccess() {
  const history = useHistory();

  // Get action type from query parameter
  const searchParams = new URLSearchParams(history.location.search);
  const action = searchParams.get('action');

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

      <div className="row g-4">
        {/* Left Section - Next Steps */}
        <div className="col-lg-8 col-xl-9">
          {action === 'generate' && (
            <div className="mb-4">
              <h3 className="mb-4">{l10n.map.onboarding_success_created_key_title}</h3>
              <p className="mb-0" style={{whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '1.1rem'}}>
                {l10n.map.onboarding_success_created_key_text}
              </p>
            </div>
          )}

          {action === 'import' && (
            <div className="mb-4">
              <h3 className="mb-4">{l10n.map.onboarding_success_imported_key_title}</h3>
              <p className="mb-0" style={{whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '1.1rem'}}>
                {l10n.map.onboarding_success_imported_key_text}
              </p>
            </div>
          )}
        </div>

        {/* Right Section - Help Sidebar */}
        <div className="col-lg-4 col-xl-3">
          <h5 className="bg-light border-bottom p-2 mb-3">{l10n.map.onboarding_success_need_help}</h5>
          <ul className="list-unstyled px-2">
            <li>
              <a href="https://mailvelope.com/help#google_workspace" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
                Google Workspace
              </a>
            </li>
            <li>
              <a href="https://mailvelope.com/help#nextcloud" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
                Nextcloud
              </a>
            </li>
            <li>
              <a href="https://mailvelope.com/help#gmail" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
                Gmail
              </a>
            </li>
            <li>
              <a href="https://mailvelope.com/help#getting_started" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
                Others
              </a>
            </li>
          </ul>
        </div>
        <div className="d-flex justify-content-center my-4 w-100">
          <button type="button" className="btn btn-primary" onClick={handleGetStarted}>
            {l10n.map.action_menu_setup_start_label}
          </button>
        </div>
      </div>
    </>
  );
}
