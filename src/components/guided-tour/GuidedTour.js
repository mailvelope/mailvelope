/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import Shepherd from 'tether-shepherd/dist/js/shepherd';
import 'tether-shepherd/dist/css/shepherd-theme-arrows.css';
import './GuidedTour.less';

export default class GuidedTour extends React.Component {
  constructor(props) {
    super(props);
    this.tour = new Shepherd.Tour({
      defaults: {
        classes: 'shepherd shepherd-open shepherd-theme-arrows'
      }
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.enabled !== this.props.enabled) {
      if (nextProps.enabled) {
        this.tour.start();
      } else {
        this.tour.cancel();
      }
    }
  }

  componentWillUnmount() {
    this.tour.cancel();
  }

  render() {
    return <div className="shepherd-backdrop"></div>;
  }
}

GuidedTour.propTypes = {
  enabled: PropTypes.bool
};

GuidedTour.defaultProps = {
  enabled: false
};
