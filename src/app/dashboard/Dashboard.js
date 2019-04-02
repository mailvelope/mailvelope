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
]);

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="row text-center">
        <div className="col-lg-6 col-xl-3 mb-3">
          <Link className="card h-100" to="/keyring/display" role="button">
            <div className="card-body">
              <img src="../img/Mailvelope/keyring.svg" role="presentation" />
            </div>
            <div className="card-footer">
              {l10n.map.dashboard_link_manage_keys}
            </div>
          </Link>
        </div>
        <div className="col-lg-6 col-xl-3 mb-3">
          <Link className="card h-100" to="/encryption/file-encrypt" role="button">
            <div className="card-body">
              <img src="../img/Mailvelope/encryption.svg" role="presentation" />
            </div>
            <div className="card-footer">
              {l10n.map.dashboard_link_encrypt_decrypt_files}
            </div>
          </Link>
        </div>
        <div className="col-lg-6 col-xl-3 mb-3">
          <Link className="card h-100" to="/settings/watchlist" role="button">
            <div className="card-body">
              <img src="../img/Mailvelope/authorized.svg" role="presentation" />
            </div>
            <div className="card-footer">
              {l10n.map.dashboard_link_manage_domains}
            </div>
          </Link>
        </div>
        <div className="col-lg-6 col-xl-3 mb-3">
          <Link className="card h-100" to="/settings/security-log" role="button">
            <div className="card-body">
              <img src="../img/Mailvelope/clipboard.svg" role="presentation" />
            </div>
            <div className="card-footer">
              {l10n.map.dashboard_link_view_security_log}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
