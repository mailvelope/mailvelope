/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {Link} from 'react-router-dom';
import './Dashboard.less';

l10n.register([
  'dashboard_link_manage_keys',
  'dashboard_link_encrypt_decrypt_files',
  'dashboard_link_view_security_log',
  'dashboard_link_manage_email_providers',
  'dashboard_link_help'
]);

export default class Dashboard extends React.Component {
  render() {
    const mailvelopeHelpUrl = "https://www.mailvelope.com/en/help";
    return (
      <div className="dashboard">
        <div className="row">
          <div className="col-md-12">
            <h3>Dashboard</h3>
          </div>
        </div>
        <div className="row">
          <div className="col-md-3">
            <Link to="/keyring/display" className="dashboard-item">
              <i className="fa fa-key"></i>
              <span>{l10n.map.dashboard_link_manage_keys}</span>
            </Link>
          </div>
          <div className="col-md-3">
            <Link to="/encryption/file-encrypt" className="dashboard-item">
              <i className="fa fa-files-o"></i>
              <span>{l10n.map.dashboard_link_encrypt_decrypt_files}</span>
            </Link>
          </div>
          <div className="col-md-3">
            <Link to="/settings/security-log" className="dashboard-item">
              <i className="fa fa-eye"></i>
              <span>{l10n.map.dashboard_link_view_security_log}</span>
            </Link>
          </div>
          <div className="col-md-3">
            <Link to="/settings/watchlist" className="dashboard-item">
              <i className="fa fa-server"></i>
              <span>{l10n.map.dashboard_link_manage_email_providers}</span>
            </Link>
          </div>
        </div>
        <div className="row">
          <div className="col-md-3">
            <a href={mailvelopeHelpUrl} className="dashboard-item" target="_blank" rel="noreferrer noopener">
              <i className="fa fa-question-circle"></i>
              <span>{l10n.map.dashboard_link_help}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}
