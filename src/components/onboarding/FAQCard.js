/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';

l10n.register([
  'onboarding_faq_title',
  'onboarding_faq_what_is_key',
  'onboarding_faq_why_need_key',
  'onboarding_faq_how_export_key'
]);

export default function FAQCard() {
  const faqBaseUrl = 'https://mailvelope.com/en/faq';

  return (
    <div className="faq-card">
      <div className="faq-card-header">
        {l10n.map.onboarding_faq_title || 'FAQ'}
      </div>
      <ul className="faq-card-list">
        <li>
          <a href={`${faqBaseUrl}#what-is-key`} target="_blank" rel="noopener noreferrer">
            {l10n.map.onboarding_faq_what_is_key || 'What is a key'}
          </a>
        </li>
        <li>
          <a href={`${faqBaseUrl}#why-need-key`} target="_blank" rel="noopener noreferrer">
            {l10n.map.onboarding_faq_why_need_key || 'Why I need a key'}
          </a>
        </li>
        <li>
          <a href={`${faqBaseUrl}#how-export-key`} target="_blank" rel="noopener noreferrer">
            {l10n.map.onboarding_faq_how_export_key || 'How to export a key'}
          </a>
        </li>
      </ul>
    </div>
  );
}
