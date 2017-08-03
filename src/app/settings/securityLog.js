/**
 * Copyright (C) 2014-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import React from 'react';
import mvelo from '../../mvelo';
import * as l10n from '../../lib/l10n';

l10n.register([
  'settings_security_log',
  'security_log_text',
  'security_log_timestamp',
  'security_log_source',
  'security_log_action'
]);

export default class SecurityLog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {secLog: []};
    this.autoRefresh = 0;
  }

  componentDidMount() {
    this.updateSecurityLog();
    this.autoRefresh = window.setInterval(() => this.updateSecurityLog(), 2000);
  }

  componentWillUnmount() {
    window.clearInterval(this.autoRefresh);
  }

  updateSecurityLog() {
    mvelo.extension.sendMessage({
      event: 'get-ui-log',
      securityLogLength: this.state.secLog.length
    }, request => this.setState(prevState => ({secLog: request.secLog.reverse().concat(prevState.secLog)})));
  }

  render() {
    return (
      <div>
        <h3>{l10n.map.settings_security_log}</h3>
        <p>{l10n.map.security_log_text}</p>
        <table className="table table-hover table-striped optionsTable">
          <thead>
            <tr>
              <th>{l10n.map.security_log_timestamp}</th>
              <th style={{width: '30%'}}>{l10n.map.security_log_source}</th>
              <th style={{width: '50%'}}>{l10n.map.security_log_action}</th>
            </tr>
          </thead>
          <tbody>
            { this.state.secLog.map(log =>
              <tr key={log.timestamp}>
                <td title={log.timestamp}><span className="glyphicon glyphicon-time"></span>&nbsp;<span>{new Date(log.timestamp).toLocaleTimeString()}</span></td>
                <td>{log.sourcei18n}</td>
                <td>{log.typei18n}</td>
              </tr>
            )
            }
          </tbody>
        </table>
      </div>
    );
  }
}
