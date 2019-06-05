/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';
import Alert from '../util/Alert';
import Spinner from '../util/Spinner';
import Terminate from '../util/Terminate';

// register language strings
l10n.register([
  'keybackup_failed',
  'keybackup_restore_dialog_button',
  'keybackup_restore_dialog_description',
  'keybackup_restore_dialog_headline',
  'keybackup_restore_dialog_list_1',
  'keybackup_restore_dialog_list_2',
  'keybackup_setup_dialog_button',
  'keybackup_setup_dialog_description',
  'keybackup_setup_dialog_headline',
  'keybackup_setup_dialog_list_1',
  'keybackup_setup_dialog_list_2',
  'keybackup_waiting_description',
  'keybackup_waiting_headline',
]);

export default class BackupKey extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waiting: false,
      terminate: false,
      action: 'setup',
      error: null
    };
    this.port = EventHandler.connect(`keyBackupDialog-${this.props.id}`, this);
    this.registerEventListeners();
    this.port.emit('keybackup-dialog-init');
    this.handleClick = this.handleClick.bind(this);
  }

  registerEventListeners() {
    this.port.on('set-init-data', ({data: {initialSetup}}) => this.setState({action: initialSetup ? 'setup' : 'restore'}));
    this.port.on('error-message', this.handleError);
    this.port.on('terminate', this.terminate);
  }

  handleError(msg) {
    if (msg.error.code !== 'PWD_DIALOG_CANCEL') {
      this.setState({waiting: false, error: new Error(l10n.map.keybackup_failed)});
    }
  }

  terminate() {
    this.setState({terminate: true}, () => this.port.disconnet());
  }

  handleClick() {
    this.logUserInput('security_log_backup_create');
    this.setState({waiting: true}, () => window.setTimeout(() => this.port.emit('create-backup-code-window'), 3000));
  }

  logUserInput(type) {
    this.port.emit('key-backup-user-input', {
      source: 'security_log_key_backup',
      type
    });
  }

  render() {
    return (
      <SecurityBG port={this.port}>
        <div className="modal d-block" style={{padding: '1rem'}}>
          <div className="modal-dialog d-flex align-items-center h-100 mw-100 m-0">
            <div className="modal-content shadow-lg border-0" style={{backgroundColor: 'rgba(255,255,255,0.8)'}}>
              <div className="modal-body d-flex flex-column overflow-auto p-4">
                {this.state.waiting ? (
                  <>
                    <Spinner style={{margin: '20px auto 20px auto'}} />
                    <h4 className="align-self-center">{l10n.map.keybackup_waiting_headline}</h4>
                    <p className="align-self-center text-center">{l10n.map.keybackup_waiting_description}</p>
                  </>
                ) : (
                  <>
                    <h4 className="mb-4">{l10n.map[`keybackup_${this.state.action}_dialog_headline`]}</h4>
                    <p>{l10n.map[`keybackup_${this.state.action}_dialog_description`]}</p>
                    <ul>
                      <li>{l10n.map[`keybackup_${this.state.action}_dialog_list_1`]}</li>
                      <li>{l10n.map[`keybackup_${this.state.action}_dialog_list_2`]}</li>
                    </ul>
                    {this.state.error && <Alert type="danger">{this.state.error.message}</Alert>}
                    <button type="button" onClick={this.handleClick} className="btn btn-primary align-self-end">{l10n.map[`keybackup_${this.state.action}_dialog_button`]}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

BackupKey.propTypes = {
  id: PropTypes.string,
};
