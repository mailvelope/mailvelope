/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Collapse} from 'reactstrap';
import Alert from '../../../components/util/Alert';
import * as l10n from '../../../lib/l10n';

import './AdvancedExpand.css';

l10n.register([
  'key_gen_advanced_btn'
]);

export default class AdvancedExpand extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collapse: false
    };
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState(state => ({collapse: !state.collapse}));
  }

  render() {
    return (
      <div>
        <div className="form-group">
          <button type="button" className={`btn btn-primary ${this.state.collapse ? 'key-advanced-open' : 'key-advanced-closed'}`} onClick={this.toggle}>{l10n.map.key_gen_advanced_btn}</button>
        </div>
        <Collapse isOpen={this.state.collapse}>
          <Alert type="info">
            {this.props.children}
          </Alert>
        </Collapse>
      </div>
    );
  }
}

AdvancedExpand.propTypes = {
  children: PropTypes.node.isRequired
};
