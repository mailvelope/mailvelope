/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../../../mvelo';
import React, {Component} from 'react';
import * as l10n from '../../../lib/l10n';
import ActionMenuAnimated from './ActionMenuAnimated';
import ActionMenuSetup from './ActionMenuSetup';
import '../ActionMenu.less';

l10n.register([
  'action_menu_help'
]);
l10n.mapToLocal();

class ActionMenuWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {isSetupDone: false};
    this.port = mvelo.EventHandler.connect('menu-59edbbeb9affc4004a916276');
  }

  componentWillMount() {
    this.port.send('get-is-setup-done')
    .then(({isSetupDone}) => this.setState({isSetupDone}));
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
    if (this.state.isSetupDone) {
      actionMenuContent = <ActionMenuAnimated onMenuItemClickHandler={e => this.onMenuItemClick(e)} />;
    } else {
      actionMenuContent = <ActionMenuSetup onMenuItemClickHandler={e => this.onMenuItemClick(e)} />;
    }

    return (
      <div className={`action-menu ${this.state.isSetupDone ? '' : 'action-menu-setup'}`}>
        <div className="action-menu-wrapper">
          <div className="action-menu-header clearfix">
            <div className="mailvelope-logo settings-logo">Mailvelope</div>
            <div className="nav-right">
              <a href="https://www.mailvelope.com/help" target="_blank" rel="noopener noreferrer">{l10n.map.action_menu_help}</a>
            </div>
          </div>
          {actionMenuContent}
        </div>
      </div>
    );
  }
}

export default ActionMenuWrapper;
