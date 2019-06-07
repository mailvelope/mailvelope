/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {Component} from 'react';
import * as l10n from '../../../lib/l10n';
import EventHandler from '../../../lib/EventHandler';
import ActionMenuBase from './ActionMenuBase';
import ActionMenuSetup from './ActionMenuSetup';
import ActionMenuNewBGSetup from './ActionMenuNewBGSetup';
import '../ActionMenu.scss';

l10n.register([
  'action_menu_help',
  'action_menu_all_options'
]);
l10n.mapToLocal();

class ActionMenuWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isSetupDone: true,
      isBGCustomized: true
    };
    this.port = EventHandler.connect('menu-59edbbeb9affc4004a916276');
  }

  componentDidMount() {
    this.init();
  }

  async init() {
    const {isSetupDone} = await this.port.send('get-is-setup-done');
    const {isBGCustomized} = await this.port.send('get-is-bg-customized');
    this.setState({isSetupDone, isBGCustomized});
  }

  onMenuItemClick(e) {
    const itemClicked = e.currentTarget;
    if (itemClicked === '' || itemClicked.id === '') {
      return false;
    }
    this.port.emit('browser-action', {action: itemClicked.id});
    this.hide();
  }

  hide() {
    $(document.body).fadeOut(() => window.close());
  }

  render() {
    let actionMenuContent = null;
    if (!this.state.isSetupDone) {
      actionMenuContent = <ActionMenuSetup onMenuItemClickHandler={e => this.onMenuItemClick(e)} />;
    } else if (!this.state.isBGCustomized) {
      actionMenuContent = <ActionMenuNewBGSetup onMenuItemClickHandler={e => this.onMenuItemClick(e)} />;
    } else {
      actionMenuContent = <ActionMenuBase onMenuItemClickHandler={e => this.onMenuItemClick(e)} />;
    }

    return (
      <div className={`action-menu ${this.state.isSetupDone ? '' : 'action-menu-setup'}`}>
        <div className="action-menu-wrapper card">
          <div className="action-menu-header card-header d-flex">
            <img src="../../img/Mailvelope/logo.svg" width="111" height="20" className="d-inline-block mr-auto" alt="" />
            <div className="nav-right">
              {(this.state.isSetupDone && this.state.isBGCustomized) && <a id="options" onClick={e => this.onMenuItemClick(e)} tabIndex="0" title={l10n.map.action_menu_all_options}><span className="icon icon-settings" aria-hidden="true"></span></a>}
              <a href="https://www.mailvelope.com/help" target="_blank" rel="noreferrer noopener" tabIndex="0" title={l10n.map.action_menu_help}><span className="icon icon-help" aria-hidden="true"></span></a>
            </div>
          </div>
          {actionMenuContent}
        </div>
      </div>
    );
  }
}

export default ActionMenuWrapper;
