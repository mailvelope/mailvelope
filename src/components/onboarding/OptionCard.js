/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * OptionCard component for onboarding screen options
 */
function OptionCard({title, description, buttonText, onClick, icon, borderColor}) {
  return (
    <div className="col">
      <div className={`card h-100 option-card ${borderColor || ''}`}>
        <div className="card-body d-flex flex-column">
          <div className="option-card-icon text-center mb-3">
            {icon && (
              typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('chrome-extension://') || icon.startsWith('/')) ?
                <img src={icon} alt={title} className="option-icon-img" /> :
                <div className="option-icon-emoji">{icon}</div>
            )}
          </div>
          <h5 className="card-title">{title}</h5>
          <p className="card-text">{description}</p>
          <div className="mt-auto">
            <button type="button" className="btn btn-primary w-100" onClick={onClick}>
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

OptionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  buttonText: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.string,
  borderColor: PropTypes.string
};

export default OptionCard;
