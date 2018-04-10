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
    this.files = [];
  }

  shouldComponentUpdate() {
    // create sandbox iframe only once
    return false;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.needSubmit === true) {
      this.form.dispatchEvent(new Event('submit'));
    }
  }

  removeInputSubmit() {
    // TODO add ability to remove tags by type using DOMPurify
    $(this.form).find('input[type=submit]').each(function() {
      $(this).remove();
    });
  }

  checkForEmptyForm() {
    // check that there is at least a valid input field to send
    let validInput = 0;
    $(this.form).find('[name]').each(function() {
      const tag = $(this).prop('tagName').toLowerCase();
      if (tag.match(/(input|select|textarea)/g).length) {
        validInput++;
      }
    });
    if (!validInput) {
      this.onError(new Error('There should be at least one input field with name property set.'));
    }
  }

  resizeIframe() {
    const height = `${this.sandbox.contentDocument.body.scrollHeight}px`;
    if (height !== this.sandbox.style.height) {
      const offset = 8;
      const newHeight = this.sandbox.contentDocument.body.scrollHeight + offset;
      this.sandbox.style.height = `${newHeight}px`;
      this.props.onResize();
    }
  }

  onFormSubmit() {
    if (this.form.checkValidity()) {
      this.getFilesValues().then(() => {
        const data = this.serializeFormData(this.props.formEncoding);
        this.props.onValidated(data);
      });
    }
    this.form.classList.add('was-validated');
    this.resizeIframe();
  }

  onError(error) {
    this.props.onError(error);
  }

  handleLoad() {
    this.resizeIframe();
    this.form = this.sandbox.contentDocument.getElementsByTagName('form')[0];

    // Remove all input type submit
    this.removeInputSubmit();

    // Check that form has at least one valid input
    this.checkForEmptyForm();

    // Prevent default behavior on form submit event
    $(this.form).on('submit', event => {
      this.onFormSubmit(event);
      event.preventDefault();
      event.stopPropagation();
    });

    // Pressing enter in an input field also triggers a submit
    $(this.form).on('keypress', 'input', event => {
      const code = event.keyCode || event.which;
      if (code === 13) {
        this.onFormSubmit(event);
        event.preventDefault();
        return false;
      }
    });

    // Keyup and focus out can trigger validation and therefore change height
    $(this.form).on('focusout keyup', 'input, textarea, select', () => {
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
      case 'url':
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
      const that = this;
      const promises = [];
      $(this.form).find('input[type=file]').each(function() {
        const name = $(this).prop('name');
        if (name !== undefined) {
          for (let i = 0; i < this.files.length; i++) {
            const reader = new FileReader();
            promises.push(new Promise((resolve => {
              reader.addEventListener('load', () => {
                that.files.push({name, 'value': reader.result});
                resolve();
              });
              reader.readAsDataURL(this.files[i]);
            })));
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
      <html>
        <head>
          <meta charset="utf-8">
          <link rel="stylesheet" href="../../dep/bootstrap4/css/bootstrap.css">
          <style>.form-row{margin-right:0}</style>
        </head>
        <body>
         <div id="root">
         ${this.props.formDefinition}
         </div>
        </body>
      </html>
    `;
    return (
      <iframe id="formSandbox"
        sandbox="allow-same-origin allow-scripts allow-forms"
        srcDoc={sandboxContent}
        frameBorder={0} width="100%" height="1px" style={{overflowY: 'hidden', overflowX: 'hidden'}}
        ref={node => this.sandbox = node}
        onLoad={() => this.handleLoad()} />
    );
  }
}

FormSandbox.propTypes = {
  formDefinition: PropTypes.string,
  formEncoding: PropTypes.string,
  needSubmit: PropTypes.bool,
  onTerminate: PropTypes.func,
  onValidated: PropTypes.func,
  onResize: PropTypes.func,
  onError: PropTypes.func
};

FormSandbox.defaultProps = {
  formEncoding: 'json',
};
