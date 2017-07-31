/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

import ModalDialog from '../../../components/util/ModalDialog';
import PrimaryKeyButton from './PrimaryKeyButton';

import KeyDetailsPrimary from './KeyDetailsPrimary';
import KeyDetailsSubkeys from './KeyDetailsSubkeys';
import KeyDetailsUserids from './KeyDetailsUserids';
import KeyDetailsExport from './KeyDetailsExport';

import './KeyDetails.css';

'use strict';

l10n.register([
  'key_details_title',
  'keygrid_primary_key',
  'keygrid_subkeys',
  'keygrid_user_ids',
  'keygrid_export',
  'dialog_popup_close'
]);

export default class KeyDetails extends React.Component {
  constructor(props) {
    super(props);
    this.handlePrimaryClick = this.handlePrimaryClick.bind(this);
    this.state = {isPrimary: props.isPrimary};
  }

  handlePrimaryClick() {
    this.props.onSetPrimaryKey();
    this.setState({isPrimary: true});
  }

  render() {
    return (
      <ModalDialog title={l10n.map.key_details_title} onHide={this.props.onHide} footer={
        <KeyDetailsFooter keyDetails={this.props.keyDetails} onPrimaryClick={this.handlePrimaryClick} isPrimary={this.state.isPrimary} />
      }>
        <div className="keyDetails">
          <ul className="nav nav-tabs" role="tablist">
            <li role="presentation" className="active"><a href="#primaryKeyTab" aria-controls="primaryKeyTab" role="tab" data-toggle="tab">{l10n.map.keygrid_primary_key}</a></li>
            <li role="presentation"><a href="#subKeysTab" aria-controls="subKeysTab" role="tab" data-toggle="tab">{l10n.map.keygrid_subkeys}</a></li>
            <li role="presentation"><a href="#userIdsTab" aria-controls="userIdsTab" role="tab" data-toggle="tab">{l10n.map.keygrid_user_ids}</a></li>
            <li role="presentation"><a href="#exportTab" aria-controls="exportTab" role="tab" data-toggle="tab">{l10n.map.keygrid_export}</a></li>
          </ul>
          <div className="tab-content">
            <div role="tabpanel" className="tab-pane active" id="primaryKeyTab">
              <KeyDetailsPrimary keyDetails={this.props.keyDetails} />
            </div>
            <div role="tabpanel" className="tab-pane" id="subKeysTab">
              <KeyDetailsSubkeys subkeys={this.props.keyDetails.subkeys} />
            </div>
            <div role="tabpanel" className="tab-pane" id="userIdsTab">
              <KeyDetailsUserids users={this.props.keyDetails.users} />
            </div>
            <div role="tabpanel" className="tab-pane" id="exportTab">
              <KeyDetailsExport keyids={[this.props.keyDetails.fingerprint]} keyName={this.props.keyDetails.name} />
            </div>
          </div>
        </div>
      </ModalDialog>
    );
  }
}

KeyDetails.propTypes = {
  keyDetails: PropTypes.object.isRequired,
  onSetPrimaryKey: PropTypes.func,
  onHide: PropTypes.func,
  isPrimary: PropTypes.bool.isRequired
};

function KeyDetailsFooter(props) {
  return (
    <div>
      { props.keyDetails.type !== 'private' ? null :
        <span className="pull-left">
          <PrimaryKeyButton onClick={props.onPrimaryClick} isPrimary={props.isPrimary} disabled={!props.keyDetails.validPrimaryKey} />
        </span>
      }
      <button type="button" className="btn btn-primary" data-dismiss="modal">
        <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;{l10n.map.dialog_popup_close}
      </button>
    </div>
  );
}

KeyDetailsFooter.propTypes = {
  keyDetails: PropTypes.object.isRequired,
  onPrimaryClick: PropTypes.func,
  isPrimary: PropTypes.bool.isRequired
};
