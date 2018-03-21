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
    this.files = [];
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

  resizeIframe() {
    const height = this.iframe.contentDocument.body.scrollHeight;
    this.iframe.style.height = height + 'px';
  }

  onFormSubmit() {
    if (this.form.checkValidity() === false) {
      // do nothing
      console.log('form is not valid');
    } else {
      // do nothing else
      console.log('form is valid');
    }
    this.getFilesValues().then(() => {
      // replace with //this.props.reponseMode
      console.log(this.serializeFormData('json'));
      console.log(this.serializeFormData('form'));
      console.log(this.serializeFormData('html'));
      this.form.classList.add('was-validated');
      this.resizeIframe();
    });
  }

  serializeFormData(mode) {
    switch (mode) {
      case 'array': {
        let result = $(this.form).serializeArray();
        if (this.files.length) {
          result = result.concat(this.files);
        }
        return result;
      }
      case 'json':
        return JSON.stringify(this.serializeFormData('array'));
      case 'form':
        return $.param(this.serializeFormData('array'));
      case 'html':
        this.updateFormValues();
        return this.form.outerHTML;
      default:
        throw new Error('This response mode format is not supported.');
    }
  }

  getFilesValues() {
    return new Promise(resolve => {
      let that = this;
      let promises = [];
      $(this.form).find('input[type=file]').each(function () {
        let name = $(this).prop('name');
        if (name !== undefined) {
          if (this.files.length > 0) {
            for (let i = 0; i < this.files.length; i++) {
              let reader = new FileReader();
              promises.push(new Promise((resolve => {
                reader.addEventListener('load', () => {
                  that.files.push({name, 'value': reader.result});
                  resolve();
                });
                reader.readAsDataURL(this.files[i]);
              })));
            }
          }
        }
      });
      Promise.all(promises).then(resolve);
    });
  }

  updateFormValues() {
    $(this.form).find('[name]').each(function() {
      switch ($(this).prop('tagName').toLowerCase()) {
        case 'textarea':
          // <textarea>value</textarea>
          $(this).text($(this).val());
          break;
        case 'select':
          // <select><option value='1' selected /></select>
          $(this).find('option').each(function() {
            $(this).attr('selected', $(this).is(':selected'));
          });
          break;
        case 'input': {
          switch ($(this).prop('type').toLowerCase()) {
            case 'radio':
            case 'checkbox':
              // <input type='checkbox|radio' checked=true|false />
              $(this).attr('checked', $(this).is(':checked'));
              break;
            case 'file': {
              // TODO ignore value in this case or reuse values in this.files?
              break;
            }
            default:
              // <input type='text|url|email|etc.' value='val' />
              $(this).attr('value', $(this).val());
              break;
          }
          break;
        }
      }
    });
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
