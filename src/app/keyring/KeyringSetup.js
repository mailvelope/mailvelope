/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import * as l10n from '../../lib/l10n';
import './KeyringSetup.scss';

l10n.register([
  'general_openpgp_preferences',
  'gnupg_connection',
  'keyring_available_settings',
  'keyring_setup',
  'keyring_setup_no_keypair_heading',
  'keyring_setup_no_keypair',
  'keyring_setup_generate_key',
  'keyring_setup_generate_key_explanation',
  'keyring_setup_import_key',
  'keyring_setup_import_key_explanation',
  'onboarding_faq_title',
  'onboarding_faq_what_is_key',
  'onboarding_faq_why_need_key',
  'onboarding_faq_how_export_key',
  'onboarding_skip'
]);

export default function KeyringSetup() {
  const location = useLocation();

  // Detect if we're in onboarding flow
  const isOnboarding = location.pathname.startsWith('/onboarding');

  // Determine link paths based on context
  const generatePath = isOnboarding ? '/onboarding/generate' : '/keyring/generate';
  const importPath = isOnboarding ? '/onboarding/import' : '/keyring/import';

  return (
    <div className="row g-4">
      {/* Left Section - Two Option Cards */}
      <div className="col-lg-8 col-xl-9">
        <div className="row row-cols-1 row-cols-md-2 g-3">

          {/* Card 1: Create a new key */}
          <div className="col mb-3">
            <div className="card h-100 border">
              <div className="card-img-top py-5 text-center border border-primary">
                <img src="/img/key.svg" width="64" height="64" alt="A key icon"></img>
              </div>
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{l10n.map.keyring_setup_generate_key}</h5>
                <p className="card-text">{l10n.map.keyring_setup_generate_key_explanation}</p>
                <Link to={generatePath} className="btn btn-primary w-100 mt-auto">
                  {l10n.map.keyring_setup_generate_key}
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Import a key you have */}
          <div className="col mb-3">
            <div className="card h-100 border">
              <div className="card-img-top py-5 text-center border border-primary">
                <img src="/img/attachment.svg" width="64" height="64" alt="Paperclip with a lock icon"></img>
              </div>
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{l10n.map.keyring_setup_import_key}</h5>
                <p className="card-text">{l10n.map.keyring_setup_import_key_explanation}</p>
                <Link to={importPath} className="btn btn-primary w-100 mt-auto">
                  {l10n.map.keyring_setup_import_key}
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* GnuPG Connection Section - only show in main app, not onboarding */}
        {!isOnboarding && (
          <div className="mt-4">
            <h5>{l10n.map.gnupg_connection}</h5>
            <p>{l10n.map.keyring_available_settings} <Link to="/settings/general">{l10n.map.general_openpgp_preferences}</Link></p>
          </div>
        )}
      </div>

      {/* Right Section - FAQ Sidebar */}
      <div className="col-lg-4 col-xl-3">
        <h5 className="bg-light border-bottom p-2 mb-3">{l10n.map.onboarding_faq_title}</h5>
        <ul className="list-unstyled px-2">
          <li>
            <a href="https://mailvelope.com/en/faq#keypair" className="d-block mb-2 text-decoration-underline">
              {l10n.map.onboarding_faq_what_is_key}
            </a>
          </li>
          <li>
            <a href="https://mailvelope.com/en/faq#about" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
              {l10n.map.onboarding_faq_why_need_key}
            </a>
          </li>
          <li>
            <a href="https://mailvelope.com/en/faq#backup" target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-decoration-underline">
              {l10n.map.onboarding_faq_how_export_key}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
