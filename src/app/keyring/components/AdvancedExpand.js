/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import $ from 'jquery';
import React from 'react';
import PropTypes from 'prop-types';

import './AdvancedExpand.css';

l10n.register([
  'key_gen_advanced_btn'
]);

export default class AdvancedExpand extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expand: false
    };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.setState(previousState => ({expand: !previousState.expand}), () => {
      // component re-rendered, trigger animation
      if (this.state.expand) {
        $(this.expandAreaNode).slideDown();
      } else {
        $(this.expandAreaNode).slideUp();
      }
    });
  }

  render() {
    return (
      <div>
        <div className="form-group">
          <button type="button" className={`btn btn-primary ${this.state.expand ? 'key-advanced-open' : 'key-advanced-closed'}`} onClick={this.handleClick}>{l10n.map.key_gen_advanced_btn}</button>
        </div>
        <div className="alert alert-info" style={{display: 'none'}} ref={node => this.expandAreaNode = node}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

AdvancedExpand.propTypes = {
  children: PropTypes.node.isRequired
};
