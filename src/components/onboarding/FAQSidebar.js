/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';

l10n.register([
  'onboarding_faq_title'
]);

/**
 * FAQSidebar component for displaying FAQ links
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of FAQ items with {label, url} properties
 */
export default function FAQSidebar({items}) {
  return (
    <div className="col-lg-4 col-xl-3">
      <h5 className="bg-light border-bottom p-2 mb-3 fw-semibold">{l10n.map.onboarding_faq_title}</h5>
      <ul className="list-unstyled px-2">
        {items.map((item, index) => (
          <li key={index}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="d-block mb-2 text-primary text-decoration-none">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

FAQSidebar.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired
  })).isRequired
};
