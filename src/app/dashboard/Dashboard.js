/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {Link} from 'react-router-dom';
import './Dashboard.scss';

l10n.register([
  'dashboard_link_manage_keys',
  'dashboard_link_encrypt_decrypt_files',
  'dashboard_link_view_security_log',
  'dashboard_link_manage_domains',
  'dashboard_link_help',
  'dashboard_title'
]);

export default function Dashboard() {
  const mailvelopeHelpUrl = 'https://www.mailvelope.com/en/help';
  return (
    <div className="dashboard">
      <div className="row text-center">
        <div className="col-md-6 col-lg-4 mb-3">
          <Link className="card h-100" to="/keyring/display" role="button">
            <div className="card-body">
              <i className="fa fa-key" role="presentation"></i>
            </div>
            <div className="card-footer h-100">
              {l10n.map.dashboard_link_manage_keys}
            </div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-4 mb-3">
          <Link className="card h-100" to="/encryption/file-encrypt" role="button">
            <div className="card-body">
              <i className="fa fa-files-o" role="presentation"></i>
            </div>
            <div className="card-footer h-100">
              {l10n.map.dashboard_link_encrypt_decrypt_files}
            </div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-4 mb-3">
          <Link className="card h-100" to="/settings/security-log" role="button">
            <div className="card-body">
              <i className="fa fa-eye" role="presentation"></i>
            </div>
            <div className="card-footer h-100">
              {l10n.map.dashboard_link_view_security_log}
            </div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-4 mb-3">
          <Link className="card h-100" to="/settings/watchlist" role="button">
            <div className="card-body">
              <i className="fa fa-server" role="presentation"></i>
            </div>
            <div className="card-footer h-100">
              {l10n.map.dashboard_link_manage_domains}
            </div>
          </Link>
        </div>
        <div className="col-md-6 col-lg-4 mb-3">
          <a className="card h-100" href={mailvelopeHelpUrl} target="_blank" rel="noreferrer noopener" role="button">
            <div className="card-body">
              <i className="fa fa-question-circle" role="presentation"></i>
            </div>
            <div className="card-footer h-100">
              {l10n.map.dashboard_link_help}
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
