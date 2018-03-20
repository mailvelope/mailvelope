/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

export default class FormSandbox extends React.Component {
  constructor(props) {
    super(props);
    this.sandbox = null;
    this.form = null;
    this.iframe = null;
  }

  shouldComponentUpdate() {
    // create sandbox iframe only once
    return false;
  }

  componentDidMount() {
    this.iframe = document.getElementsByTagName('iframe')[0];
    this.iframe.onload = () => {
      this.form = this.iframe.contentDocument.getElementsByTagName('form')[0];
      this.form.addEventListener('submit', event => {
        this.onFormSubmit(event);
        event.preventDefault();
        event.stopPropagation();
      });
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.needSubmit === true) {
      this.form.dispatchEvent(new Event('submit'));
    }
  }

  onFormSubmit() {
    if (this.form.checkValidity() === false) {
      // do nothing
      console.log('form is not valid');
    } else {
      // do nothing else
      console.log('form is valid');
    }
    console.log(this.extractFormData());
    this.form.classList.add('was-validated');
    this.resizeIframe();
  }

  resizeIframe() {
    const height = this.iframe.contentDocument.body.scrollHeight;
    this.iframe.style.height = height + 'px';
  }

  extractFormData() {
    if (this.props.reponseMode === 'form') {
      return $(this.form).serializeArray();
    }
    if (this.props.reponseMode === 'url') {
      return $(this.form).serialize();
    }
  }

  render() {
    const sandboxContent = `
      <!DOCTYPE html>
      <html style="height: 100%">
        <head>
          <meta charset="utf-8">
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">
        </head>
        <body style="height: 100%">
         <div id="root" style="height: 100%">
         ${this.props.formDefinition}
         </div>
        </body>
      </html>
    `;
    return (
      <iframe id="formSandbox"
        sandbox="allow-same-origin allow-scripts allow-forms"
        srcDoc={sandboxContent}
        frameBorder={0} width="100%" height="200px" style={{overflowY: 'hidden', overflowX: 'scroll'}}
        ref={node => this.sandbox = node}
        onLoad={() => this.resizeIframe()} />
    );
  }
}

FormSandbox.propTypes = {
  reponseMode: PropTypes.string,
  formDefinition: PropTypes.string,
  needSubmit: PropTypes.bool,
  onTerminate: PropTypes.func,
  onValidated: PropTypes.func
};

FormSandbox.defaultProps = {
  reponseMode: 'form',
};
