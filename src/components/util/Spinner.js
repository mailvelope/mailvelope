
import React from 'react';
import PropTypes from 'prop-types';

import './Spinner.css';

export default class Spinner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hide: this.props.delay ? true : false
    };
    this.timer = 0;
  }

  componentDidMount() {
    if (this.props.delay) {
      // show spinner after delay
      this.timer = setTimeout(() => this.setState({hide: false}), this.props.delay);
    }
  }

  componentWillUnmount() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  render() {
    return (
      <div className={`m-spinner-${this.props.fullscreen ? 'fullscreen' : 'inline'} ${this.state.hide ? 'hide' : ''}`} style={this.props.style}>
        <div className="symbol">
          <div className="bounce1"></div><div className="bounce2"></div><div className="bounce3"></div>
        </div>
      </div>
    );
  }
}

Spinner.propTypes = {
  style: PropTypes.object,
  delay: PropTypes.number,
  fullscreen: PropTypes.bool
};

Spinner.defaultProps = {
  delay: 400,
  fullscreen: false
};
