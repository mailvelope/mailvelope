/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import Toast from './Toast';

export default class Notifications extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      queue: []
    };
  }

  componentDidUpdate() {
    const newItems = [];
    for (const item of this.props.items) {
      if (!this.state.queue.find(existingItem => existingItem.id === item.id)) {
        newItems.unshift({...item, show: true});
      }
    }
    if (newItems.length) {
      this.setState(prevState => ({queue: newItems.concat(prevState.queue)}));
    }
  }

  hideNotification(id, timeout = 0) {
    setTimeout(() => {
      this.setState(prevState => {
        const queue = [...prevState.queue];
        queue[queue.findIndex(item => item.id === id)].show = false;
        return {queue};
      });
    }, timeout);
  }

  render() {
    if (!this.state.queue.length) {
      return (null);
    }
    return (
      <div className="toastWrapper">
        {this.state.queue.map(item =>
          (
            <Toast isOpen={item.show} key={item.id} toggle={() => this.hideNotification(item.id, 0)} type={item.type} transition={{unmountOnExit: true, timeout: this.props.transitionTime, onEntered: () => this.hideNotification(item.id, item.hideDelay ? item.hideDelay : this.props.hideDelay)}}>
              {item.link ? (
                <Link className="text-reset text-decoration-none" onClick={() => this.hideNotification(item.id, 0)} to={`${item.link}`} role="button">
                  {item.header ? <strong className="strong">{item.header}</strong> : ''} {item.message}
                </Link>
              ) : (
                <span>{item.header ? <strong className="strong">{item.header}</strong> : ''} {item.message}</span>
              )}
            </Toast>
          )
        )}
      </div>
    );
  }
}

Notifications.propTypes = {
  items: PropTypes.array, // {id, [type], [link], [header], message}
  transitionTime: PropTypes.number,
  hideDelay: PropTypes.number
};

Notifications.defaultProps = {
  transitionTime: 150,
  hideDelay: 3500,
};
