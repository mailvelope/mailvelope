
import React from 'react';
import PropTypes from 'prop-types';

import './Spinner.css';

export default class Spinner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hide: true
    };
    this.timer = 0;
  }

  componentDidMount() {
    // show spinner after delay
    this.timer = setTimeout(() => this.setState({hide: false}), 400);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    return (
      <div className={`m-spinner ${this.state.hide ? 'hide' : ''}`} style={this.props.style}>
        <div className="bounce1"></div><div className="bounce2"></div><div className="bounce3"></div>
      </div>
    );
  }
}

Spinner.propTypes = {
  style: PropTypes.object
};
