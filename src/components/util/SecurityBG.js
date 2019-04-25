
import React from 'react';
import PropTypes from 'prop-types';
import {getSecurityBackground} from '../../lib/util';

import './SecurityBG.css';

export default class SecurityBG extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      image: 'none',
      color: 'none'
    };
    props.port.on('update-security-background', () => this.setSecurityBG());
  }

  componentDidMount() {
    this.setSecurityBG();
  }

  async setSecurityBG() {
    const {image, color} = await getSecurityBackground(this.props.port);
    this.setState({image, color});
  }

  render() {
    return (
      <div className={`securityBG ${this.props.className || ''}`} style={{backgroundImage: this.state.image, backgroundColor: this.state.color}}>
        {this.props.children}
      </div>
    );
  }
}

SecurityBG.propTypes = {
  className: PropTypes.string,
  port: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired
};
