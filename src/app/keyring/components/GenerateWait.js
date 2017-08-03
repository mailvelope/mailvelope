/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';

import './GenerateWait.css';

'use strict';

l10n.register([
  'key_gen_wait_header',
  'key_gen_wait_info'
]);

export default class GenerateWait extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    $('#genKeyWait').one('show.bs.modal', this.props.onShow);
    $('#genKeyWait').modal({backdrop: 'static', keyboard: false});
    $('#genKeyWait').modal('show');
  }

  componentWillUnmount() {
    $('#genKeyWait').modal('hide');
  }

  render() {
    return (
      <div  className="modal" id="genKeyWait" tabIndex="-1" role="dialog" aria-hidden="true">
        <div  className="modal-dialog">
          <div  className="modal-content">
            <div  className="modal-header">
              <h3>{l10n.map.key_gen_wait_header}</h3>
            </div>
            <div  className="modal-body">
              <div  className="center-block wait-indicator"></div>
            </div>
            <div  className="modal-footer">
              <span>{l10n.map.key_gen_wait_info}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

GenerateWait.propTypes = {
  onShow: PropTypes.func
}
