/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import $ from 'jquery';

export default class FormSandbox extends React.Component {
  constructor(props) {
    super(props);
    this.sandbox = null;
  }

  shouldComponentUpdate() {
    // create sandbox iframe only once
    return false;
  }

  componentDidMount() {
    this.createFormSandbox();
  }

  getValue() {
    return 'html';
  }

  createFormSandbox() {
    const sandbox = $(this.sandbox);
    sandbox.one('load', () => {
      sandbox.one('load', this.props.onTerminate);
      ReactDOM.render(this.createForm(), sandbox.contents().find('#root').get(0));
    });
  }

  createForm() {
    return (
      <div dangerouslySetInnerHTML={{ __html: this.props.formDefinition }} />
    );
  }

  render() {
    const sandboxContent = `
      <!DOCTYPE html>
      <html style="height: 100%">
        <head>
          <meta charset="utf-8">
          <link rel="stylesheet" href="../../dep/bootstrap/css/bootstrap.css">
          <link rel="stylesheet" href="../../mvelo.css">
        </head>
        <body style="overflow: hidden; margin: 0; height: 100%">
         <div id="root" style="height: 100%">
         </div>
        </body>
      </html>
    `;
    return (
      <iframe sandbox="allow-same-origin allow-scripts" srcDoc={sandboxContent} frameBorder={0} width="100%" height="500px" style={{overflowY: 'hidden'}} ref={node => this.sandbox = node} />
    );
  }
}

FormSandbox.propTypes = {
  formDefinition: PropTypes.string,
  onTerminate: PropTypes.func
};
