/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

export default class PlainText extends React.PureComponent {
  constructor(props) {
    super(props);
    this.sandbox = null;
    this.textarea = null;
  }

  componentDidUpdate(prevProps) {
    // if default value is set after rendering, set manually
    if (this.textarea && prevProps.defaultValue !== this.props.defaultValue) {
      this.textarea.value = this.props.defaultValue;
      this.textarea.selectionStart = 0;
      this.textarea.selectionEnd = 0;
    }
  }

  getValue() {
    return this.textarea.value;
  }

  createPlainText() {
    const textarea = (
      <textarea defaultValue={this.props.defaultValue} className="form-control" rows={12} autoFocus
        onChange={event => this.props.onChange(event.target.value)}
        onBlur={this.props.onBlur}
        onMouseUp={this.props.onMouseUp}
        ref={node => this.textarea = node}
        style={{width: '100%', height: '100%', marginBottom: 0, color: 'black', resize: 'none', lineHeight: 1.5}}
      />
    );

    const sandboxDoc = this.sandbox.contentDocument;
    const content = sandboxDoc.querySelector('#root');
    ReactDOM.render(textarea, content);
    this.props.onLoad && this.props.onLoad();
  }

  render() {
    const sandboxContent = `
      <!DOCTYPE html>
      <html style="height: 100%">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <link rel="stylesheet" href="../../main.css">
        </head>
        <body style="overflow: hidden; margin: 0; height: 100%; background-color: transparent">
         <div id="root" style="height: 100%; padding: 0.2rem">
         </div>
        </body>
      </html>
    `;
    return (
      <iframe sandbox="allow-same-origin allow-scripts" srcDoc={sandboxContent} frameBorder={0} style={{display: 'block', height: '100%', overflowY: 'hidden'}}
        ref={node => this.sandbox = node} onLoad={() => this.createPlainText()} />
    );
  }
}

PlainText.propTypes = {
  defaultValue: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onMouseUp: PropTypes.func,
  onLoad: PropTypes.func
};

