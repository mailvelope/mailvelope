/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import * as l10n from '../../lib/l10n';
import FAQSidebar from '../../components/onboarding/FAQSidebar';

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
  'onboarding_faq_what_is_key',
  'onboarding_faq_backup',
  'onboarding_faq_where_key_stored',
  'onboarding_skip'
]);

export default function KeyringSetup({isOnboarding = false}) {
  const generatePath = isOnboarding ? '/onboarding/generate' : '/keyring/generate';
  const importPath = isOnboarding ? '/onboarding/import' : '/keyring/import';

  // Card hover effect
  const cardStyle = {
    transition: 'box-shadow 0.3s ease',
    minHeight: '280px'
  };

  const cardBorderStyle = {
    border: '1px solid rgba(227, 0, 72, 0.25)', // primary color with 50 alpha
  };

  // FAQ items for welcome screen
  const faqItems = [
    {label: l10n.map.onboarding_faq_what_is_key, url: 'https://mailvelope.com/en/faq#keypair'},
    {label: l10n.map.onboarding_faq_backup, url: 'https://mailvelope.com/en/faq#backup'},
    {label: l10n.map.onboarding_faq_where_key_stored, url: 'https://mailvelope.com/en/faq#keys'}
  ];

  return (
    <div className="row g-4">
      {/* Left Section - Two Option Cards */}
      <div className="col-lg-8 col-xl-9">
        <div className="row row-cols-1 row-cols-md-2 g-3">

          {/* Card 1: Create a new key */}
          <div className="col mb-3">
            <div className="card h-100 border" style={cardStyle}>
              <div className="card-img-top py-5 text-center" style={cardBorderStyle}>
                <img src="/img/key.svg" width="64" height="64" alt="A key icon"></img>
              </div>
              <div className="card-body d-flex flex-column" style={{minHeight: '200px'}}>
                <h5 className="card-title">{l10n.map.keyring_setup_generate_key}</h5>
                <p className="card-text flex-grow-1">{l10n.map.keyring_setup_generate_key_explanation}</p>
                <Link to={generatePath} className="btn btn-primary btn-lg w-100 mt-auto">
                  {l10n.map.keyring_setup_generate_key}
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Import a key you have */}
          <div className="col mb-3">
            <div className="card h-100 border" style={cardStyle}>
              <div className="card-img-top py-5 text-center" style={cardBorderStyle}>
                <img src="/img/attachment.svg" width="64" height="64" alt="Paperclip with a lock icon"></img>
              </div>
              <div className="card-body d-flex flex-column" style={{minHeight: '200px'}}>
                <h5 className="card-title">{l10n.map.keyring_setup_import_key}</h5>
                <p className="card-text flex-grow-1">{l10n.map.keyring_setup_import_key_explanation}</p>
                <Link to={importPath} className="btn btn-primary btn-lg w-100 mt-auto">
                  {l10n.map.keyring_setup_import_key}
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* GnuPG Connection Section - only show in main app, not onboarding */}
        {!isOnboarding && (
          <div className="mt-4">
            <h5 className="fw-semibold">{l10n.map.gnupg_connection}</h5>
            <p>{l10n.map.keyring_available_settings} <Link to="/settings/general" className="text-primary">{l10n.map.general_openpgp_preferences}</Link></p>
          </div>
        )}
      </div>

      {/* Right Section - FAQ Sidebar */}
      <FAQSidebar items={faqItems} />
    </div>
  );
}

KeyringSetup.propTypes = {
  isOnboarding: PropTypes.bool
};
