/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {brand, MvError} from '../../../lib/util';
import $ from 'jquery';
import {readUploadFile} from '../../../lib/file';

export default class FormSandbox extends React.Component {
  constructor(props) {
    super(props);
    this.sandbox = null;
    this.form = null;
    this.files = [];
  }

  componentDidUpdate() {
    if (this.props.validate === true) {
      // trigger validation using native form submit event
      this.form.dispatchEvent(new Event('submit'));
    }
  }

  removeBlacklistedInputs() {
    // a separate cleaning process is required as dompurify
    // does not support sanitizing by input types, these are equivalent to <button>
    $(this.form).find('input[type=submit]').each(function() { $(this).remove(); });
    $(this.form).find('input[type=image]').each(function() { $(this).remove(); });
    $(this.form).find('input[type=reset]').each(function() { $(this).remove(); });
  }

  checkForEmptyForm() {
    // check that there is at least a valid input field to send
    const validInput = $(this.form).find('input[name], select[name], textarea[name]').length;
    if (!validInput) {
      this.onError(new MvError('There should be at least one input field with name property set.', 'NO_FORM_INPUT'));
    }
  }

  resizeIframe() {
    const height = `${this.sandbox.contentDocument.body.scrollHeight}px`;
    if (height !== this.sandbox.style.height) {
      let offset = 0;
      if (!brand.chromium) {
        offset = 16;
      }
      const newHeight = this.sandbox.contentDocument.body.scrollHeight + offset;
      this.sandbox.style.height = `${newHeight}px`;
      this.props.onResize();
    }
  }

  onFormValidate() {
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

    // Remove all input type submit, img, etc.
    this.removeBlacklistedInputs();

    // Check that form has at least one valid input
    this.checkForEmptyForm();

    // Prevent default behavior on form submit event
    $(this.form).on('submit', event => {
      this.onFormValidate(event);
      event.preventDefault();
      event.stopPropagation();
    });

    // Pressing enter in an input field also triggers a submit
    $(this.form).on('keypress', 'input', event => {
      const code = event.keyCode || event.which;
      if (code === 13) {
        this.onFormValidate(event);
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
      case 'html':
        this.updateFormValues();
        return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>OpenPGP Encrypted Form Data</title>
  </head>
  <body>
   ${this.form.outerHTML}
  </body>
</html>`;
      case 'url':
      default:
        return $.param(this.serializeFormData('array'));
    }
  }

  getFilesValues() {
    const promises = [];
    $(this.form).find('input[type=file]').each(function() {
      const name = $(this).prop('name');
      if (name) {
        Array.from(this.files).forEach(file => promises.push(
          readUploadFile(file)
          .then(result => ({
            name,
            filename: result.name,
            value: result.content
          }))
        ));
      }
    });
    return Promise.all(promises).then(results => {
      this.files = results;
    });
  }

  appendFileDownloadLinks(input) {
    const downloadLinks = [];
    Array.from(this.files).forEach(file => {
      if (file.name === $(input).prop('name')) {
        const link = $(`<li><a href="${file.value}" download="${file.filename}">${file.filename}</a></li>`);
        downloadLinks.push(link);
      }
    });
    if (downloadLinks.length) {
      const id = `download-links-${$(input).prop('name')}`;
      const list = $(`<ul id='${id}' class="download-links"/>`);
      downloadLinks.forEach(link => $(list).append(link));
      $(list).insertAfter(input);
    }
  }

  updateFormValues() {
    const self = this;
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
              // insert files as ul.li.a(href=dataurl download=filename) after file input
              self.appendFileDownloadLinks(this);
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
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
          <link rel="stylesheet" href="../../main.css">
          <style>.form-row{margin-right:0;} .download-links {display:none;}</style>
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
  validate: PropTypes.bool,
  onValidated: PropTypes.func,
  onResize: PropTypes.func,
  onError: PropTypes.func
};

FormSandbox.defaultProps = {
  formEncoding: 'json',
};
