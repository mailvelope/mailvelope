/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {Component} from 'react';
import ActionMenuBase from './ActionMenuBase';
import ActionMenuAdvanced from './ActionMenuAdvanced';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ActionMenuAnimated extends Component {
  showBaseOptions() {
    $('.action-menu-container-slide').animate({marginLeft: "0px"}, 200);
    $('div.action-menu').css('height', 300);
  }

  showAdvancedOptions() {
    $('.action-menu-container-slide').animate({marginLeft: "-230px"}, 200);
    const realHeight = $('div.action-menu')[0].scrollHeight;
    $('div.action-menu').css('height', realHeight);
  }

  render() {
    return (
      <div className="action-menu-container-slide-container">
        <div className="action-menu-container-slide">
          <ActionMenuBase onMenuItemClickHandler={this.props.onMenuItemClickHandler}  onShowAdvancedOptionsHandler={this.showAdvancedOptions} />
          <ActionMenuAdvanced onMenuItemClickHandler={this.props.onMenuItemClickHandler} onShowBaseOptionsHandler={this.showBaseOptions} />
        </div>
      </div>
    );
  }
}

ActionMenuAnimated.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuAnimated;
