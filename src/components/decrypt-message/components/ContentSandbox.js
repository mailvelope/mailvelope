/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {parseHTML} from '../../../lib/util';

export default class ContentSandbox extends React.PureComponent {
  constructor(props) {
    super(props);
    this.sandbox = null;
  }

  componentDidUpdate(prevProps) {
    if (this.sandbox && prevProps.value !== this.props.value) {
      this.setContent(this.props.value);
    }
  }

  setContent(value) {
    if (!value) {
      return;
    }
    const sandboxDoc = this.sandbox.contentDocument;
    const content = sandboxDoc.querySelector('#content');
    content.replaceChildren(...parseHTML(value));
  }

  render() {
    const sandboxContent = `
      <!DOCTYPE html>
      <html style="height: 100%">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
          <link rel="stylesheet" href="../../main.css">
        </head>
        <body style="overflow: hidden; margin: 0; height: 100%; background-color: transparent">
         <div id="content" style="height: 100%; overflow: auto;">
         </div>
        </body>
      </html>
    `;
    return (
      <iframe style={{border: '1px solid lightgray', backgroundColor: 'white', borderRadius: '2px'}}
        srcDoc={sandboxContent} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        frameBorder="0" ref={node => this.sandbox = node} onLoad={() => this.setContent(this.props.value)} />
    );
  }
}

ContentSandbox.propTypes = {
  value: PropTypes.string
};
